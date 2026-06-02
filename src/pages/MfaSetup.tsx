import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/utils/error-handler";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUnidade } from "@/contexts/UnidadeContext";
import { Loader2, Shield, Download, Copy, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function MfaSetup() {
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [factorId, setFactorId] = useState<string>("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentUnidade } = useUnidade();
  const unitName = currentUnidade?.nome || "Zafen";

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    enrollMfa();
  }, [user, navigate]);

  const generateRecoveryCodes = () => {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  };

  const enrollMfa = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `${unitName} MFA`,
      });

      if (error) throw error;

      if (data) {
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);

        // Gera códigos de recuperação
        const codes = generateRecoveryCodes();
        setRecoveryCodes(codes);
      }
    } catch (error: any) {
      handleError(error, "Erro ao configurar MFA");
    } finally {
      setIsLoading(false);
    }
  };

  const saveRecoveryCodes = async () => {
    if (!user) return;

    try {
      const codeInserts = recoveryCodes.map((code) => ({
        user_id: user.id,
        code: code,
      }));

      const { error } = await supabase
        .from("mfa_recovery_codes")
        .insert(codeInserts);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error saving recovery codes:", error);
      throw error;
    }
  };

  const verifyAndEnableMfa = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Código inválido",
        description: "Por favor, insira um código de 6 dígitos",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factorId,
        code: verificationCode,
      });

      if (error) throw error;

      // Salva códigos de recuperação
      await saveRecoveryCodes();

      toast({
        title: "MFA ativado com sucesso!",
        description: "Sua conta agora está protegida com autenticação de dois fatores.",
      });

      // Mostra códigos de recuperação
      setShowRecoveryCodes(true);
    } catch (error: any) {
      handleError(error, "Erro ao verificar código");
    } finally {
      setIsVerifying(false);
    }
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const downloadRecoveryCodes = () => {
    const text = recoveryCodes.join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${unitName.toLowerCase().replace(/\s+/g, '-')}-recovery-codes.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Códigos salvos",
      description: "Guarde estes códigos em local seguro!",
    });
  };

  const finishSetup = () => {
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showRecoveryCodes) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Códigos de Recuperação</CardTitle>
            </div>
            <CardDescription>
              Salve estes códigos em local seguro. Você precisará deles caso perca acesso ao seu autenticador.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert variant="destructive">
              <AlertDescription>
                <strong>IMPORTANTE:</strong> Estes códigos só são exibidos uma vez. Cada código pode ser usado apenas uma vez.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-2">
              {recoveryCodes.map((code, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted rounded-md"
                >
                  <code className="text-sm font-mono">{code}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyCode(code)}
                    className="h-6 w-6 p-0"
                  >
                    {copiedCode === code ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Button
                onClick={downloadRecoveryCodes}
                variant="outline"
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar Códigos
              </Button>

              <Button onClick={finishSetup} className="w-full">
                Concluir Configuração
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Configurar MFA</CardTitle>
          </div>
          <CardDescription>
            Configure a autenticação de dois fatores para maior segurança
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertDescription>
              Use um aplicativo autenticador como Google Authenticator, Authy ou Microsoft Authenticator.
            </AlertDescription>
          </Alert>

          {qrCode && (
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={qrCode} alt="QR Code" className="w-48 h-48" />
              </div>

              <div className="space-y-2">
                <Label>Ou insira o código manualmente:</Label>
                <div className="p-3 bg-muted rounded-md">
                  <code className="text-sm font-mono break-all">{secret}</code>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verification-code">Código de verificação</Label>
                <Input
                  id="verification-code"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                  disabled={isVerifying}
                />
                <p className="text-sm text-muted-foreground">
                  Insira o código de 6 dígitos do seu aplicativo autenticador
                </p>
              </div>

              <Button
                onClick={verifyAndEnableMfa}
                disabled={isVerifying || verificationCode.length !== 6}
                className="w-full"
              >
                {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verificar e Ativar MFA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
