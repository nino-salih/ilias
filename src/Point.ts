
export type Point = {
  id: string;
  vector: number[];
  payload: {
    content: string;
    metadata: any;
    location: {
      previous_chunk: string;
      next_chunk: string;
    };
  };
};