export const capitalizeFullName = (name: string): string =>
  name.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());
