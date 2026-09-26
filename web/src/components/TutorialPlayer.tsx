import { useEffect, useRef } from "react";
import './TutorialPlayer.css';

export const TutorialPlayer = ({
        stepNumber,     // Assuming this is 1-based (e.g., 1, 2, 3...) or matches tutorial.steps[].stepNumber
        setStepNumber,
        onStepChanged,
        tutorial,
}) => {
        const svgContainerRef = useRef<HTMLDivElement>(null);
      
        // 1. Calculate indices and current steps directly during render. No refs!
        const currentStepIndex = tutorial.steps.findIndex(s => s.stepNumber == stepNumber);
        
        // Fallback safety: if stepNumber isn't found, default safely to index 0
        const safeIndex = currentStepIndex !== -1 ? currentStepIndex : 0;
        const currentStep = tutorial.steps[safeIndex];

        useEffect(() => {
          const container = svgContainerRef.current;
          if (!container) return;
      
          const svgRoot = container.querySelector('svg');
          if (!svgRoot) return;
      
          // Collect elements intended for the current snapshot setup
          const currentIds = currentStep.svgElements;
          const historicalIds: string[] = [];
      
          for (let i = 0; i <= safeIndex; i++) {
            tutorial.steps[i].svgElements.forEach((id) => {
              if (!historicalIds.includes(id)) historicalIds.push(id);
            });
          }
      
          // Process arrows systematically based on step index to prevent visual layout bugs
          const arrows = svgRoot.querySelectorAll('.arrow');
          arrows.forEach((arrow, index) => {
            arrow.classList.remove('ne-svg-hidden', 'ne-svg-faded');
            const arrowMap = [5, 4, 3, 2, 1]; 
            const targetStep = arrowMap[index];
      
            if (safeIndex + 1 === targetStep) {
              // Highlighting active arrow path
            } else if (safeIndex + 1 > targetStep) {
              arrow.classList.add('ne-svg-faded');
            } else {
              arrow.classList.add('ne-svg-hidden');
            }
          });
      
          // Check visibility states cleanly by targeting specific shapes instead of parent nodes
          const renderableElements = svgRoot.querySelectorAll('rect, text, path:not(.arrow)');
      
          renderableElements.forEach((element) => {
            const elementId = element.id;
            const parentGroup = element.closest('g[id]');
            const parentId = parentGroup ? parentGroup.id : null;
      
            element.classList.remove('ne-svg-hidden', 'ne-svg-faded');
      
            const isCurrent = currentIds.includes(elementId) || (parentId && currentIds.includes(parentId));
            const isHistorical = historicalIds.includes(elementId) || (parentId && historicalIds.includes(parentId));
      
            if (parentId === 'chart') {
              if (safeIndex > 0 && safeIndex < 6) {
                return; 
              }
            }
      
            if (isCurrent) {
              // Keep active element fully opaque
            } else if (isHistorical) {
              element.classList.add('ne-svg-faded');
            } else {
              element.classList.add('ne-svg-hidden');
            }
          });
        }, [stepNumber, tutorial, safeIndex, currentStep]); // Added deep safe dependencies
      
        const handleStepChange = (direction: number) => {
          const nextIndex = safeIndex + direction;
          if (nextIndex >= 0 && nextIndex < tutorial.steps.length) {
            // Get the actual stepNumber configuration value of the next step object
            const nextStepNumber = tutorial.steps[nextIndex].stepNumber;
            
            setStepNumber(nextStepNumber);
            if (onStepChanged) {
              onStepChanged(nextStepNumber);
            }
          }
        };
      
        return (
          <div className="ne-body-wrapper">
            <div className="ne-container" dir="rtl">
              {/* Top Header / Progress Area */}
              <div className="ne-header">
                <span className="ne-step-indicator">
                  الخطوة {currentStep.stepNumber} من {tutorial.steps.length}
                </span>
              </div>
      
              {/* Embedded Vector Graphics Viewport */}
              <div 
                className="ne-viewport" 
                ref={svgContainerRef} 
                dangerouslySetInnerHTML={{ __html: tutorial.svg }}
              />
      
              {/* Interactive Text & Control Station */}
              <div className="ne-footer">
                <div className="ne-narration-text">
                  {currentStep.textToSay}
                </div>
                
                <div className="ne-controls">
                  <button 
                    type="button"
                    className="ne-btn-back" 
                    disabled={safeIndex === 0}
                    onClick={() => handleStepChange(-1)}
                  >
                    السابق
                  </button>
                  <button 
                    type="button"
                    className="ne-btn-next" 
                    disabled={safeIndex === tutorial.steps.length - 1}
                    onClick={() => handleStepChange(1)}
                  >
                    التالي
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      };

export default TutorialPlayer;