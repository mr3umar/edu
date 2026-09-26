/**
 * JsonLinesStreamParser
 * ---------------------
 *
 * Incrementally parses a streamed JSON document of the shape:
 *
 *   {
 *     "lines": [
 *       { "line": "...", ... },
 *       { "line": "...", ... }
 *     ]
 *   }
 *
 * Text can arrive in arbitrarily small or large fragments (as it does from an
 * LLM token stream), including fragments that split a token, a string escape
 * sequence, or a brace in half. The parser tracks a persistent scan
 * position across calls to `feed()` and only ever examines *new*
 * characters once — it never re-scans or re-parses text it has already
 * resolved — and it only calls `JSON.parse` once per completed object
 * inside `lines`, never on the whole buffer.
 *
 * STATE MACHINE OVERVIEW
 * =======================
 * The parser is a single forward-scanning character machine with two
 * orthogonal pieces of state:
 *
 *   1. `Phase` — where we are in the *document*:
 *        - SEEKING_LINES_ARRAY: we have not yet found `"lines"` followed by
 *          `[`. Everything before that point is skipped (it's just the
 *          opening `{ "lines":` boilerplate).
 *        - IN_LINES_ARRAY: we are inside the `lines` array, between elements.
 *          We are looking for the start of the next object (`{`) or the
 *          array's closing `]`.
 *        - IN_LINE_OBJECT: we are inside one element object of `lines`,
 *          tracking brace depth until that single object closes.
 *        - DONE: the `lines` array has closed (`]` seen at depth 0 inside the
 *          array). No further objects will be emitted.
 *
 *   2. While IN_LINE_OBJECT, a nested mini state machine tracks:
 *        - `braceDepth`: depth of `{ }` nesting *within the current object*.
 *          The object is complete when depth returns to 0 after having been
 *          opened (i.e. we've seen the matching closing brace).
 *        - `inString` / `escapeNext`: whether we are currently inside a
 *          double-quoted JSON string, and whether the next character is
 *          escaped (preceded by an unescaped backslash). This is what lets
 *          the parser correctly ignore `{`, `}`, `[`, `]`, and `"` characters
 *          that appear *inside* string values (including escaped quotes like
 *          `\"`) rather than misinterpreting them as structural tokens.
 *
 * Bracket depth tracking inside the object also accounts for nested arrays
 * (`[ ]`) and nested objects (`{ }`) at any depth, since both share the same
 * "ignore structural characters while inString" rule and only `{`/`}`
 * affect `braceDepth` (a `[`/`]` nested inside a line object does not need
 * its own counter — it is naturally balanced because every `[` must be
 * closed before its enclosing `{` can close, and we don't care about
 * anything *inside* the object other than where it ends).
 *
 * Each input fragment is fed through `feed()`, which resumes a persistent
 * scan cursor (`scanPosition`) through the new characters exactly once.
 * Whenever a complete top-level `lines[i]` object is found, its raw JSON
 * substring is sliced out and queued; `JSON.parse` is invoked on just that
 * slice when the consumer calls `nextObject()`.
 */

/** Where we are in the overall `{ "lines": [ ... ] }` document. */
type Phase = "SEEKING_LINES_ARRAY" | "IN_LINES_ARRAY" | "IN_LINE_OBJECT" | "DONE";

/**
 * Tracks how far we've gotten in matching the literal token `"lines"` while
 * in the SEEKING_LINES_ARRAY phase, so that partial matches spanning
 * multiple `feed()` calls are handled correctly (e.g. one chunk ends with
 * `{"li` and the next begins with `nes":[`).
 */
const LINES_KEY_TOKEN = '"lines"';

export class JsonLinesStreamParser {
  private phase: Phase = "SEEKING_LINES_ARRAY";

  // --- SEEKING_LINES_ARRAY state ---
  /** How many characters of `"lines"` we've matched so far, in order. */
  private keyMatchLength = 0;
  /** After matching `"lines"`, we still need to skip whitespace, then `:`, then whitespace, then `[`. */
  private seenColon = false;

  // --- IN_LINE_OBJECT state ---
  private braceDepth = 0;
  private inString = false;
  private escapeNext = false;
  /** Start index (in `pending`) of the line object currently being scanned. */
  private currentObjectStart = -1;

  /**
   * Buffer of not-yet-fully-processed text. We periodically discard a
   * fully-consumed prefix (see `compact`) purely to bound memory; the
   * authoritative position of "how far we've scanned" is always
   * `scanPosition`, which never resets to 0 except when it and `pending`
   * are compacted together.
   */
  private pending = "";

  /**
   * Index into `pending` of the next character to be scanned. This is the
   * single source of truth for "where we left off" — we never re-scan
   * anything before this position.
   */
  private scanPosition = 0;

  /** Completed (but not yet retrieved) raw JSON object strings. */
  private completedObjects: string[] = [];

  /** True once the `lines` array has closed. */
  private isFinished = false;

  /**
   * Feed the next fragment of streamed text into the parser. Safe to call
   * with any split: a single character, a half-token, multiple objects at
   * once, etc.
   */
  public feed(chunk: string): void {
    if (this.isFinished || chunk.length === 0) {
      return;
    }

    this.pending += chunk;

    // Resume scanning from exactly where we left off — `scanPosition` is
    // the single source of truth for how much of `pending` has already
    // been resolved, so we never re-examine earlier characters.
    let cursor = this.scanPosition;

    while (cursor < this.pending.length) {
      const char = this.pending[cursor];

      switch (this.phase) {
        case "SEEKING_LINES_ARRAY": {
          cursor = this.advanceSeekingLinesArray(cursor);
          break;
        }

        case "IN_LINES_ARRAY": {
          if (this.isWhitespace(char) || char === ",") {
            // Separator/whitespace between array elements; skip.
            cursor++;
          } else if (char === "{") {
            // Start of the next line object.
            this.phase = "IN_LINE_OBJECT";
            this.currentObjectStart = cursor;
            this.braceDepth = 1;
            this.inString = false;
            this.escapeNext = false;
            cursor++;
          } else if (char === "]") {
            // The `lines` array has closed — no more objects will follow.
            this.phase = "DONE";
            this.isFinished = true;
            cursor++;
          } else {
            // Anything else here would be malformed JSON for our expected
            // shape; skip defensively rather than throwing, since a stray
            // character shouldn't crash an otherwise-recoverable stream.
            cursor++;
          }
          break;
        }

        case "IN_LINE_OBJECT": {
          cursor = this.advanceInLineObject(cursor);
          break;
        }

        case "DONE": {
          // Nothing more to do; consume and ignore any trailing characters
          // (e.g. the final `}` closing the root object).
          cursor++;
          break;
        }
      }
    }

    this.scanPosition = cursor;
    this.compact();
  }

  /**
   * Advance the cursor while in SEEKING_LINES_ARRAY phase. Looks for the
   * literal `"lines"` key followed by `:` and `[`. Returns the new cursor
   * position (always `oldCursor + 1`, since this phase consumes one
   * character at a time, but kept as a function for clarity and symmetry
   * with `advanceInLineObject`).
   */
  private advanceSeekingLinesArray(cursor: number): number {
    const char = this.pending[cursor];

    if (!this.seenColon) {
      if (this.keyMatchLength < LINES_KEY_TOKEN.length) {
        // Still trying to match the `"lines"` token character-by-character.
        if (char === LINES_KEY_TOKEN[this.keyMatchLength]) {
          this.keyMatchLength++;
        } else {
          // Mismatch: reset and keep scanning for the token from here.
          // (A correct, non-pathological document will have exactly one
          // `"lines"` key, so this reset is safe and simple.)
          this.keyMatchLength = char === LINES_KEY_TOKEN[0] ? 1 : 0;
        }
        return cursor + 1;
      }

      // We've matched the full `"lines"` token; now skip whitespace and
      // require a `:`.
      if (this.isWhitespace(char)) {
        return cursor + 1;
      }
      if (char === ":") {
        this.seenColon = true;
        return cursor + 1;
      }
      // Unexpected character between key and colon; keep skipping.
      return cursor + 1;
    }

    // After the colon, skip whitespace until we find the array's `[`.
    if (this.isWhitespace(char)) {
      return cursor + 1;
    }
    if (char === "[") {
      this.phase = "IN_LINES_ARRAY";
    }
    return cursor + 1;
  }

  /**
   * Advance the cursor while scanning the body of a single `lines[i]`
   * object, tracking string state and brace depth. Returns the new cursor
   * position (always `oldCursor + 1`).
   */
  private advanceInLineObject(cursor: number): number {
    const char = this.pending[cursor];

    if (this.inString) {
      if (this.escapeNext) {
        // This character is escaped (e.g. the `"` in `\"`, or the `\` in
        // `\\`); it cannot end the string or be a structural character.
        this.escapeNext = false;
      } else if (char === "\\") {
        this.escapeNext = true;
      } else if (char === '"') {
        this.inString = false;
      }
      // Any other character inside a string (including `{`, `}`, `[`, `]`,
      // `,`) is just string content and does not affect brace depth.
      return cursor + 1;
    }

    if (char === '"') {
      this.inString = true;
      return cursor + 1;
    }

    if (char === "{") {
      this.braceDepth++;
      return cursor + 1;
    }

    if (char === "}") {
      this.braceDepth--;
      if (this.braceDepth === 0) {
        // The current line object is complete. Slice out its raw JSON text
        // (inclusive of this closing brace) and queue it.
        const objectText = this.pending.slice(this.currentObjectStart, cursor + 1);
        this.completedObjects.push(objectText);
        this.currentObjectStart = -1;
        this.phase = "IN_LINES_ARRAY";
      }
      return cursor + 1;
    }

    // `[`, `]`, `,`, whitespace, and ordinary value characters (digits,
    // letters of `true`/`false`/`null`, etc.) don't affect brace depth and
    // are simply skipped over.
    return cursor + 1;
  }

  /**
   * Bound memory usage by discarding a prefix of `pending` that will never
   * be needed again. This is purely a memory optimization — `scanPosition`
   * (and `currentObjectStart`, if set) are shifted by the same amount so
   * that all indices remain valid and no re-scanning occurs.
   *
   * The safe trim point is `currentObjectStart` if we're in the middle of
   * assembling an object (we must keep its text from the start), otherwise
   * `scanPosition` (everything before the scan cursor has already been
   * fully resolved into either skipped boilerplate or completed objects).
   */
  private compact(): void {
    const safeTrimPoint =
      this.phase === "IN_LINE_OBJECT" && this.currentObjectStart >= 0
        ? this.currentObjectStart
        : this.scanPosition;

    if (safeTrimPoint <= 0) {
      return;
    }

    this.pending = this.pending.slice(safeTrimPoint);
    this.scanPosition -= safeTrimPoint;
    if (this.currentObjectStart >= 0) {
      this.currentObjectStart -= safeTrimPoint;
    }
  }

  private isWhitespace(char: string): boolean {
    return char === " " || char === "\n" || char === "\r" || char === "\t";
  }

  /** Whether at least one fully-parsed object is ready to be retrieved. */
  public hasObject(): boolean {
    return this.completedObjects.length > 0;
  }

  /**
   * Pop and parse the next completed line object. Returns `null` if none is
   * available. `JSON.parse` is called on exactly this one object's raw
   * text — never on the whole buffer.
   */
  public nextObject<T = unknown>(): T | null {
    const raw = this.completedObjects.shift();
    if (raw === undefined) {
      return null;
    }
    return JSON.parse(raw) as T;
  }

  /** Whether the `lines` array has closed (no further objects will arrive). */
  public finished(): boolean {
    return this.isFinished;
  }
}