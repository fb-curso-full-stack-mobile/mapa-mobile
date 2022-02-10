export type Position = {
  id: number;
  lat: number;
  lng: number;
  accuracy: number;
  heading: number;
  username: string | null;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
};
