export type LongMultiplicationContent = {
  type: "longMultiplication";

  parts: {
    type:
      | "multiplicand"
      | "multiplier"
      | "partialProduct"
      | "sum";

    value: number;
  }[];
};