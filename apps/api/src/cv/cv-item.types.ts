export interface CvItemMutationResponse {
  version: string;
  parentId?: string;
  childIndex?: number;
  item?: unknown;
  value?: string;
}
