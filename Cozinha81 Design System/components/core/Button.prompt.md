Main action button — flame-orange `primary` for the single most important action on a view; `ink` for strong neutral actions; `secondary`/`ghost` for everything else.

```jsx
<Button variant="primary" size="lg">Reservar cozinha</Button>
<Button variant="secondary" iconLeft={<PlusIcon/>}>Ver unidades</Button>
<Button variant="ghost" size="sm">Cancelar</Button>
```

Variants: `primary` (flame), `ink` (black), `secondary` (outline), `ghost` (text), `danger`. Sizes: `sm | md | lg`. Use `block` for full-width. One primary per view.
