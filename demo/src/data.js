export const LANGS = {
  'Java 21': { mode: 'text/x-java', file: 'Main.java' },
  'Python 3.12': { mode: 'text/x-python', file: 'utils.py' },
  'Node.js 20': { mode: 'text/javascript', file: 'app.js' },
  'Go 1.22': { mode: 'text/x-go', file: 'main.go' },
  'Rust 1.78': { mode: 'text/x-rust', file: 'main.rs' }
}

export const EXT_MODE = {
  java: 'text/x-java',
  py: 'text/x-python',
  js: 'text/javascript',
  go: 'text/x-go',
  rs: 'text/x-rust',
  md: 'text/x-markdown'
}

export const EXT_LANG = {
  java: 'Java 21',
  py: 'Python 3.12',
  js: 'Node.js 20',
  go: 'Go 1.22',
  rs: 'Rust 1.78'
}

export const DEFAULT_FILES = ['Main.java', 'utils.py', 'README.md']

export const TEMPLATES = {
  'Main.java': `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, 码瑙!");
        int n = 10;
        for (int i = 1; i <= n; i++) {
            System.out.print(fib(i) + " ");
        }
        System.out.println();
    }
    public static int fib(int n) {
        if (n <= 1) return n;
        return fib(n - 1) + fib(n - 2);
    }
}`,
  'utils.py': `def greet(name):
    return f"你好, {name}!"
def fib(n):
    if n <= 1: return n
    return fib(n-1)+fib(n-2)`,
  'README.md': `# demo-project
欢迎使用码瑙！`,
  'app.js': `console.log("Hello, 码瑙!");
function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}
for (let i = 1; i <= 10; i++) console.log(fib(i));`,
  'main.go': `package main

import "fmt"

func fib(n int) int {
  if n <= 1 { return n }
  return fib(n-1) + fib(n-2)
}

func main() {
  for i := 1; i <= 10; i++ {
    fmt.Print(fib(i), " ")
  }
  fmt.Println()
}`,
  'main.rs': `fn fib(n: u32) -> u32 {
    if n <= 1 { return n; }
    fib(n - 1) + fib(n - 2)
}

fn main() {
    for i in 1..=10 {
        print!("{} ", fib(i));
    }
    println!();
}`
}
