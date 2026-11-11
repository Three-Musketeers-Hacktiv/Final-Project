import Panel from "./Panel";
import Icon, { type IconName } from "./Icon";
import Image, { type StaticImageData } from "next/image";

type ThisWaveProps = {
  name: string;
  hp: number;
  attack: number;
  description: string;
  art: StaticImageData | null;
};

export default function ThisWave({ name, hp, attack, description, art }: ThisWaveProps) {
  const stats: { label: string; value: number; icon: IconName }[] = [
    { label: "HP", value: hp, icon: "heart" },
    { label: "ATK", value: attack, icon: "attack" },
  ];

  return (
    <Panel title="This Wave" icon={<Icon name="thisWave" className="size-6" />}>
      <div className="flex items-center gap-4">
        {art && <Image src={art} alt="" sizes="8rem" className="h-auto w-32 shrink-0" />}
        <div className="flex-1">
          <h3 className="mb-2 text-2xl font-bold text-parchment">{name}</h3>
          <dl className="divide-y divide-frame/40 border-y border-frame/40">
            {stats.map(({ label, value, icon }) => (
              <div key={label} className="flex items-center gap-3 py-1.5">
                <Icon name={icon} className="size-5" />
                <dt className="flex-1">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <p className="mt-4 border-t border-frame/40 pt-3 italic text-muted">{description}</p>
    </Panel>
  );
}
