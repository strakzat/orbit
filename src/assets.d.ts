/** Font files are inlined by tsup as data URLs. */
declare module "*.woff2" {
  const dataUrl: string;
  export default dataUrl;
}
