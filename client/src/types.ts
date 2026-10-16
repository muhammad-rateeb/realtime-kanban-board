export interface User {
  id: string;
  email: string;
  name: string;
  createdAt?: string;
}

export interface Member {
  id: string;
  role: "OWNER" | "MEMBER";
  userId: string;
  user: Pick<User, "id" | "name" | "email">;
}

export interface CardData {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  position: number;
}

export interface ListData {
  id: string;
  boardId: string;
  title: string;
  position: number;
  cards: CardData[];
}

export interface BoardSummary {
  id: string;
  title: string;
  ownerId: string;
  owner: { id: string; name: string };
  members: Member[];
  lists: ListData[];
  updatedAt: string;
}

export interface BoardDetail {
  id: string;
  title: string;
  ownerId: string;
  owner: { id: string; name: string };
  members: Member[];
  lists: ListData[];
  createdAt: string;
  updatedAt: string;
}
