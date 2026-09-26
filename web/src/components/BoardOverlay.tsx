type Props = {
        onClose: () => void;
      };
      
      export default function BoardOverlay({
        onClose,
      }: Props) {
        return (
          <div className="board-overlay">
            <button onClick={onClose}>
              Close
            </button>
      
            <div className="board-content">
              Board Area
            </div>
          </div>
        );
      }