export interface CvItemMutationResponse {
  version: string;
  index?: number;
  parentIndex?: number;
  childIndex?: number;
  item?: unknown;
  value?: string;
}
