/// <reference types="vite/client" />

declare module "*.css";
declare module "*.css?url" {
  const url: string;
  export default url;
}
declare module "*.png" {
  const src: string;
  export default src;
}
