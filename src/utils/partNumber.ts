/** Compares part numbers the way the spare part lookup does: letters and digits only, any case. */
export const sanitizePartNumber = (value: string) =>
  value.replaceAll(/[^a-zA-Z0-9]/g, "").toUpperCase();
