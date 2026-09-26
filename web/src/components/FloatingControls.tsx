import { useTutor } from "../api/tutor/hook";

type Props = {
        micEnabled: boolean;
        onToggleMic: () => void;
      
        onOpenTutorials: () => void;
      
        onBack: () => void;
      };
      
      export default function FloatingControls({
        micEnabled,
        onToggleMic,
        onOpenTutorials,
        onBack,
      }: Props) {

          const { setIsBoardOpen, isBoardOpen } = useTutor()

        return (
          <div className="controls">
            <button onClick={onBack}>
              Back
            </button>
      
            <button onClick={onToggleMic}>
              {micEnabled ? 'Mic ON' : 'Mic OFF'}
            </button>
      
      <button onClick={() => setIsBoardOpen(!isBoardOpen)}>
        Board
      </button>
      
      <button onClick={onOpenTutorials}>
        Tutorials
      </button>
          </div>
        );
      }