import { useEffect } from "react";
import { useUnidade } from "@/contexts/UnidadeContext";
import { hexToHSL } from "@/utils/colors";

export const ThemeColorInjector = () => {
  const { currentUnidade } = useUnidade();

  useEffect(() => {
    if (currentUnidade?.cor_primaria) {
      const hslValue = hexToHSL(currentUnidade.cor_primaria);
      
      // Atualiza a variável --primary do Tailwind (formato: "H S% L%")
      document.documentElement.style.setProperty("--primary", hslValue);
      
      // Também atualiza o --ring e variáveis de sidebar para combinar com a marca
      document.documentElement.style.setProperty("--ring", hslValue);
      document.documentElement.style.setProperty("--sidebar-primary", hslValue);
      document.documentElement.style.setProperty("--sidebar-accent-foreground", hslValue);
      
      // [OPTIONAL] Se quiser ajustar o background dos botões primários
      // document.documentElement.style.setProperty("--primary-foreground", "0 0% 100%");
    }
  }, [currentUnidade?.cor_primaria]);

  return null; // Este componente não renderiza nada visualmente
};
