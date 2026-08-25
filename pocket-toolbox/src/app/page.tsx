import TipCalculator from "@/components/tools/tip-calculator";
import BmiCalculator from "@/components/tools/bmi-calculator";
import UnitConverter from "@/components/tools/unit-converter";
import ColorConverter from "@/components/tools/color-converter";
import PasswordGenerator from "@/components/tools/password-generator";
import CountdownTimer from "@/components/tools/countdown-timer";
import Stopwatch from "@/components/tools/stopwatch";
import WordCounter from "@/components/tools/word-counter";
import DiceRoller from "@/components/tools/dice-roller";
import CoinFlip from "@/components/tools/coin-flip";
import RandomNumber from "@/components/tools/random-number";
import AgeCalculator from "@/components/tools/age-calculator";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Pocket Toolbox</h1>
        <p className="text-sm opacity-60">Twelve tiny tools, one page.</p>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TipCalculator />
        <BmiCalculator />
        <UnitConverter />
        <ColorConverter />
        <PasswordGenerator />
        <CountdownTimer />
        <Stopwatch />
        <WordCounter />
        <DiceRoller />
        <CoinFlip />
        <RandomNumber />
        <AgeCalculator />
      </div>
    </main>
  );
}
