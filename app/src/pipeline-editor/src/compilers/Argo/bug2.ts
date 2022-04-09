//interface A {
//type A = {
class A {
  constructor() {
    this.name = "A";
  }
  name: string;
  a?: string;
}

//interface B {
//type B = {
class B {
  constructor() {
    this.name = "B";
  }
  name: string;
  b?: string;
}

function receiver(aFunc: (a: A) => string) {
  const a: A = { name: "a", a: "aa" };
  const result = aFunc(a);
  return result;
}

const test1 = (bFunc: (b: B) => string) => {
  // We're passing bFunc while receiver expects aFunc
  receiver(bFunc);
};

const test2 = () => {
  const receiver2 = (a: A) => {};
  const b: B = { name: "b", b: "bb" };
  // Fails
  //const a: A = { name: "b", b: "bb" };
  // Succeeds
  const a: A = b;
  receiver2(b);
};

export {};
