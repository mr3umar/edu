import { PageAnalysisE } from 'edu-ai-domain';
import * as fs from 'fs';

/**
 * Forcefully removes a directory and all its files synchronously.
 * @param dirPath - The target folder path to delete.
 */
export function removeDirectorySync(dirPath: string): void {
        try {
          fs.rmSync(dirPath, { recursive: true, force: true });
          console.log(`🗑️ Successfully deleted directory: ${dirPath}`);
        } catch (error) {
          console.error(`❌ Failed to delete directory at ${dirPath}:`, error);
          throw error;
        }
      }




      export function transformToGlobalWordLayout(inputParts: PageAnalysisE["data"]["parts"]) {
        const globalWords: PageAnalysisE["data"]["words"] = [];
        let globalWordCounter = 1;
      
        // Regex to capture spatial attributes and text
        // const tagRegex = /\[word\s+x="([^"]+)"\s+y="([^"]+)"\s+width="([^"]+)"\s+height="([^"]+)"\](.*?)\[\/word\]/g;
        const tagRegex = /\[word\s+([^\]]+)\]([\s\S]*?)\[\/word\]/g;
        const attrRegex = /(\w+)=(?:"([^"]*)"|\\?"([^"\\]*)\\?")/g;

        const updatedParts = inputParts.map((part) => {
          // If content is missing or doesn't contain the tags, return as-is
          if (!part.content || !part.content.includes('[word')) {
            return { ...part };
          }
      
          // Process the content field and replace with global sequential IDs
          let localSeq = 0

          
          const short = part.content.replace(
            tagRegex,
            (_, attrs, wordText) => {

              let match;
              const attributes: Record<string, string> = {};

              while ((match = attrRegex.exec(attrs)) !== null) {
                attributes[match[1]] = match[2];
              }
              
              const currentGlobalId = `${globalWordCounter+(localSeq++)}`;
      
              const x = attributes.x ? parseInt(attributes.x) : undefined
              const y = attributes.y ? parseInt(attributes.y) : undefined
              const width = attributes.width ? parseInt(attributes.width) : 10
              const height = attributes.height ? parseInt(attributes.height) : 10

              // Push the data directly into our global accumulator array
              globalWords.push({
                id: currentGlobalId,
                partId: part.id, // Reference to the parent component
                text: wordText,
                x,
                y,
                width,
                height,
              });
      
              return `[word id="${currentGlobalId}"]${wordText}[/word]`
            }
          );

          localSeq = 0

          const full = part.content.replace(
            tagRegex,
            (_, attrs, wordText) => {
              const currentGlobalId = `${globalWordCounter+(localSeq++)}`;
      
              const attributes: Record<string, string> = {};
              let match;

              while ((match = attrRegex.exec(attrs)) !== null) {
                attributes[match[1]] = match[2];
              }

              const x = attributes.x ? parseInt(attributes.x) : undefined
              const y = attributes.y ? parseInt(attributes.y) : undefined
              const width = attributes.width ? parseInt(attributes.width) : 10
              const height = attributes.height ? parseInt(attributes.height) : 10
      
              return `[word id="${currentGlobalId}" x="${x}" y="${y}" width="${width}" height="${height}"]${wordText}[/word]`
            }
          );

          globalWordCounter += localSeq;
      
          return {
            ...part,
            transformedText: {
              short,
              full
            }
          };
        });
      
        return {
          parts: updatedParts,
          words: globalWords
        };
      }

      interface DocumentPart {
        seq_id: number;
        type: string;
        label?: string | null;
        parent_id: number | null;
        content?: string;  // Original content remains untouched
        content2?: string; // Contains short global IDs: [tag:word id="w1"]text[/tag:word]
        coordinates?: {
          min_x: number;
          min_y: number;
          max_x: number;
          max_y: number;
        };
      }
      
      interface GlobalWord {
        id: string; // Global sequence ID (e.g., "w1", "w2", "w3"...)
        part_id: number; // Links the word back to its parent part seq_id
        text: string;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
      }
      
      export interface DocumentRoot {
        parts: DocumentPart[];
        words: GlobalWord[]; // Global words array at the root level
      }