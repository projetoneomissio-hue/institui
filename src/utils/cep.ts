export const formatCEP = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return digits;
};

interface ViaCEPResult {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
}

export const fetchCEP = async (cep: string): Promise<ViaCEPResult | null> => {
  const clean = cep.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;
    return data as ViaCEPResult;
  } catch {
    return null;
  }
};
