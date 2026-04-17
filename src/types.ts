export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  tips: string;
  category: Category;
  isRequired: boolean;
}

export type Category = 
  | 'hearing'
  | 'selection'
  | 'viewing' 
  | 'application' 
  | 'contract' 
  | 'move_in';

export interface CategoryInfo {
  id: Category;
  title: string;
  icon: string;
}
