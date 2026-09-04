The signature product card — a bookable kitchen with live status, equipment tags, price and CTA. Use in marketplace grids and search results.

```jsx
<KitchenCard
  name="Estação 04 · Vila Leopoldina"
  location="Vila Leopoldina, São Paulo"
  status="ready"
  price="R$ 48"
  tags={['Coifa industrial', 'Forno combinado', '24h']}
  onReserve={() => {}}
/>
```

Omit `image` to get the burner-mark placeholder panel. `status` drives the StatusPill.
