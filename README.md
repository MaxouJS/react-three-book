# @objectifthunes/react-three-book

R3F-first book component built on top of `@objectifthunes/three-book`.

## Installation

```bash
pnpm add @objectifthunes/react-three-book @objectifthunes/three-book three @react-three/fiber react react-dom
```

## Local demo

From the `react-three-book` directory:

```bash
pnpm install
pnpm demo
```

Build-only check:

```bash
pnpm demo:build
```

## Why this package

- Declarative React props for book content/setup.
- Built-in pointer drag interaction wiring for page turning.
- R3F primitive-compatible component with `ref` access to the underlying `Book`.

## Usage

```tsx
import { Canvas } from '@react-three/fiber';
import { Book3D, type BookContentInput } from '@objectifthunes/react-three-book';

const content: BookContentInput = {
  direction: 'left-to-right',
  covers: [frontOuter, frontInner, backInner, backOuter],
  pages: [page1, page2, page3, page4],
};

export function Scene() {
  return (
    <Canvas>
      <Book3D
        content={content}
        page={{ width: 2, height: 3, thickness: 0.02, stiffness: 0.2, color: '#ffffff' }}
        cover={{ width: 2.1, height: 3.1, thickness: 0.04, stiffness: 0.5, color: '#8b0000' }}
        position={[0, 0, 0]}
      />
    </Canvas>
  );
}
```

## API

### `Book3D` / `ReactThreeBook`

`ReactThreeBook` is an alias of `Book3D`.

Key props:

- `content: BookContentInput` (required)
- `page?: PaperSetupInput`
- `cover?: PaperSetupInput`
- `autoInit?: boolean` (default `true`)
- `updateEveryFrame?: boolean` (default `true`)
- `interactive?: boolean` (default `true`)
- `onReady?: (book) => void`
- `onTurnStart?: () => void`
- `onTurnEnd?: () => void`
- plus all normal R3F `<primitive />` props (except `object`)

### `BookContentInput`

- `direction?: 'left-to-right' | 'right-to-left' | 'up-to-down' | 'down-to-up'`
- `covers: [frontOuter, frontInner, backInner, backOuter]`
- `pages: Texture[]`

Each cover/page item can be `THREE.Texture | null`.

## Imperative control

Use `ref` if you want direct access to the underlying `Book` methods:

```tsx
const ref = React.useRef<BookHandle>(null);
// ref.current?.setOpenProgress(0.5)
```

## Notes

- This package does not re-export the entire `three-book` API.
- Memoize `content`, `page`, and `cover` props for stable instance lifecycles.
