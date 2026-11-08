import Icon from "./Icon";

type RunSummaryProps = {
  label: string;
  day: number;
  cityHp: number;
  cityMaxHp: number;
  gold: number;
};

/** One-line run overview (day, HP, gold), used on the home screen and in the settings dialog. */
export default function RunSummary({ label, day, cityHp, cityMaxHp, gold }: RunSummaryProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-sm border-2 border-frame/60 bg-ink/40 px-3 py-2">
      <span className="font-semibold">{label}</span>
      <span className="text-muted">Day {day}</span>
      <span className="flex items-center gap-1.5">
        <Icon name="cityHp" className="size-5" />
        {cityHp} / {cityMaxHp}
      </span>
      <span className="flex items-center gap-1.5 text-gold">
        <Icon name="gold" className="size-5" />
        {gold}
      </span>
    </div>
  );
}
