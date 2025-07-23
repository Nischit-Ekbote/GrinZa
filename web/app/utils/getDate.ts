export const getDate = (hexTimestamp: string | null): string => {
  if (!hexTimestamp) return "No deadline";

  try {
    // Parse hex as BigInt
    const timestamp = BigInt(hexTimestamp);

    // Convert from ms to s if needed
    const adjusted = timestamp > 9999999999n ? timestamp / 1000n : timestamp;

    // Convert BigInt to Number safely (if within range)
    if (adjusted > BigInt(Number.MAX_SAFE_INTEGER)) {
      return "Date too far in future";
    }

    const date = new Date(Number(adjusted) * 1000);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  } catch (err) {
    console.error("❌ Failed to parse hex timestamp:", hexTimestamp, err);
    return "Invalid date";
  }
};
