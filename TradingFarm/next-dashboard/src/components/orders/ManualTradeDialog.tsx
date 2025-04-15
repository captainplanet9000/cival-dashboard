import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function ManualTradeDialog({ onSubmit }: { onSubmit: (order: any) => void }) {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState("buy");
  const [quantity, setQuantity] = useState(0);
  const [price, setPrice] = useState(0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Manual Trade</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Manual Trade</DialogTitle>
        <form
          onSubmit={e => {
            e.preventDefault();
            onSubmit({ symbol, side, quantity, price });
            setOpen(false);
          }}
        >
          <input placeholder="Symbol" value={symbol} onChange={e => setSymbol(e.target.value)} required />
          <select value={side} onChange={e => setSide(e.target.value)}>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
          <input type="number" placeholder="Quantity" value={quantity} onChange={e => setQuantity(Number(e.target.value))} required />
          <input type="number" placeholder="Price" value={price} onChange={e => setPrice(Number(e.target.value))} required />
          <Button type="submit">Submit Order</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
