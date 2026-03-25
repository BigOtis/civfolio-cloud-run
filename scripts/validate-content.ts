import { getWorldData } from "../src/lib/content";

async function main() {
  const data = await getWorldData();
  console.log(
    `Validated ${data.works.length} works across ${data.timeline.length} timeline snapshots.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
