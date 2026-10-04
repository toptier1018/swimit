import { getOpsSheetEnrollmentCounts } from "../lib/ops-sheet-enrollment.ts";

async function main() {
  const r = await getOpsSheetEnrollmentCounts();
  const startKeys = Object.entries(r.counts || {}).filter(([k]) =>
    k.includes("스타트"),
  );
  const oct18 = Object.entries(r.counts || {}).filter(([k]) =>
    k.includes("10/18"),
  );
  console.log(
    JSON.stringify(
      {
        success: r.success,
        error: r.error,
        confirmedRows: r.confirmedRows,
        holdRows: r.holdRows,
        startKeys,
        oct18,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
