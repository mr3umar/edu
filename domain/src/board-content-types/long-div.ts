export type LongDivisionContent = {
      
  parts: {
        type:
          | "dividend"
          | "divisor"
          | "quotient"
          | "product"
          | "difference"
          | "bringDown";
    
        value: string;
      }[];
      };
      