
import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { pick } from "stream-json/filters/pick.js";
import { streamArray } from 'stream-json/streamers/stream-array.js';
import { Deferred } from '../common/functions/deferred.js';

export class JsonLineSplitter<LineT> {
        private raw = '';
        private finished = false;
        private def = new Deferred()
        private pipeline = chain([
          parser(),
          pick({ filter: this.filter }),
          streamArray(),
        ]);
      
        constructor(
          private readonly handleLine: (index: number, line: LineT) => void,
          // private readonly onEnd: (full: any, error?: Error) => void,
          private readonly filter: string,
        ) {
            this.pipeline.on('data', ({ key, value }: { key: number; value: LineT }) => {
                this.handleLine(key, value);
              });
      
          this.pipeline.on('error', (error) => {
            console.error('JSON stream error:', error, error.message, error.stack);
          });
          this.pipeline.on('end', () => {
            try {
              this.finish(JSON.parse(this.raw));
            } catch (err) {
              this.finish(null, err as Error);
            }
          })
        }
      
        push(delta: string) {
            this.raw += delta;                   // keep a copy for the final parse
          this.pipeline.write(delta);
        }
      
        end() {
          this.pipeline.end();
        }
        private finish(full: any, error?: Error) {
          if (this.finished) {
            this.def.reject(error)
            return;           
          }
          this.finished = true;
          // this.onEnd(full, error);
          this.def.resolve(full)
        }

        getJson() {
          return this.def.promise
        }
      }