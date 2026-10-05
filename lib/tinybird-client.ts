import "server-only";

// The typed client remains private to the Node server runtime. The definitions
// module is separate because Tinybird's CLI executes it outside Next.js.
export { tinybird } from "./tinybird";
