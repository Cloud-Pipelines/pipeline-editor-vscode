export {};

export interface A {
  a: string;
}

interface B {
  b: string;
}

const aFunc = (a: A) => {
  return "a";
};
const bFunc = (b: B) => {
  return "b";
};

const receiver = (func: (a: A) => string) => {};

// Argument of type '(b: B) => string' is not assignable to parameter of type '(a: A) => string'.
//   Types of parameters 'b' and 'a' are incompatible.
//     Property 'b' is missing in type 'A' but required in type 'B'.ts(2345)
// bug.ts(6, 3): 'b' is declared here.
//
//receiver(bFunc);

// const xxx = (
//     func: (b: B) => string
// ) => {
//     receiver(func);
// }

