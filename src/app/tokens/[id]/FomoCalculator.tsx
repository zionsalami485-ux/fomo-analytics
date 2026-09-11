"use client";

import { useState } from "react";

export default function FomoCalculator({
  firstPrice,
  lastPrice,
    }: {
  firstPrice: number;
  lastPrice: number;
    }) {
    const [amount, setAmount] = useState<number | "">(100);
    const [period, setPeriod] = useState("7D");
    const tokensBought = (amount === "" ? 0 : amount) / firstPrice;
    const numericAmount = amount === "" ? 0 : amount;
    const currentValue = tokensBought * lastPrice;
    const profitLoss = currentValue - numericAmount;
    const roi = numericAmount === 0 ? 0 : (profitLoss / numericAmount) * 100;
  return (
    <div className="mt-4">
        <div className="flex gap-2 mb-4">
<button
  onClick={() => setPeriod("7D")}
 className={
  period === "7D"
    ? "bg-blue-600 px-3 py-1 rounded"
    : "bg-gray-800 px-3 py-1 rounded"
}
>
  7D
</button>
  <button
  onClick={() => setPeriod("30D")}
  className={
  period === "30D"
    ? "bg-blue-600 px-3 py-1 rounded"
    : "bg-gray-800 px-3 py-1 rounded"
}
>
  30D
</button>

 <button
  onClick={() => setPeriod("1Y")}
  className={
    period === "1Y"
      ? "bg-blue-600 px-3 py-1 rounded"
      : "bg-gray-800 px-3 py-1 rounded"
  }
>
  1Y
</button>
</div>



        <p className="text-gray-400 mb-2">
            Investment Amount
        </p>

        <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg px-4 w-fit">
            <span className="text-gray-400 mr-2">$</span>

         <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => {
            const value = e.target.value;
            setAmount(value === "" ? "" : Math.max(0, Number(value)));
            }}
            className="bg-transparent py-2 text-white outline-none"
        />
        </div>

        {amount !== "" && (
        <p className="mt-4 text-white font-semibold">
            ${numericAmount} invested 7 days ago would be worth ${currentValue.toFixed(2)} today.
        </p>
        )}

        {amount !== "" && (
        <p className="mt-2 text-gray-400">
            Tokens bought: {tokensBought.toFixed(4)}
        </p>
        )}

        {amount !== "" && (
        <p className="mt-2 text-white font-semibold">
            Value Today: ${currentValue.toFixed(2)}
        </p>
        )}

        {amount !== "" && (
        <p
            className={
               profitLoss > 0
  ? "mt-2 text-green-400 font-semibold"
  : profitLoss < 0
  ? "mt-2 text-red-400 font-semibold"
  : "mt-2 text-gray-400 font-semibold"
                    }
                >
                Profit/Loss: {profitLoss > 0 ? "+" : profitLoss < 0 ? "-" : ""}$
            {Math.abs(profitLoss).toFixed(2)}
        </p>
        )}

        {amount !== "" && (
        <p
  className={
    roi > 0
  ? "mt-2 text-green-400 font-semibold"
  : roi < 0
  ? "mt-2 text-red-400 font-semibold"
  : "mt-2 text-gray-400 font-semibold"
  }
>
  ROI: {roi > 0 ? "+" : ""}
{roi.toFixed(2)}%
</p>
)}
    </div>
  );
}