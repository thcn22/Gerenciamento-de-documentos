import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  ArrowLeft, 
  Settings, 
  Sun, 
  Moon, 
  Monitor, 
  Palette 
} from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering theme controls after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (newTheme: string) => {
    // Adiciona uma classe de transição temporariamente
    document.documentElement.classList.add('theme-transition');
    
    setTheme(newTheme);
    
    // Remove a classe após a transição
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition');
    }, 300);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Configurações
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Gerencie suas preferências e configurações do sistema
            </p>
          </div>
        </div>

        {/* Theme Settings Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Aparência
            </CardTitle>
            <CardDescription>
              Escolha como você gostaria que o aplicativo apareça.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-base font-medium">Tema</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Selecione um tema ou configure para seguir o sistema automaticamente.
              </p>
              
              <RadioGroup
                value={theme}
                onValueChange={handleThemeChange}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
              >
                <div className="flex items-center space-x-2 rounded-lg border p-4 hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:scale-[1.02] hover:shadow-sm">
                  <RadioGroupItem value="light" id="light" />
                  <Label htmlFor="light" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Sun className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
                    Claro
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 rounded-lg border p-4 hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:scale-[1.02] hover:shadow-sm">
                  <RadioGroupItem value="dark" id="dark" />
                  <Label htmlFor="dark" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Moon className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
                    Escuro
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 rounded-lg border p-4 hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:scale-[1.02] hover:shadow-sm">
                  <RadioGroupItem value="system" id="system" />
                  <Label htmlFor="system" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Monitor className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
                    Sistema
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                <strong>Claro:</strong> Interface clara sempre ativa<br />
                <strong>Escuro:</strong> Interface escura sempre ativa<br />
                <strong>Sistema:</strong> Segue a preferência do seu sistema operacional
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Settings Cards */}
        <Card>
          <CardHeader>
            <CardTitle>Outras Configurações</CardTitle>
            <CardDescription>
              Configurações adicionais estarão disponíveis em futuras atualizações.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Em breve você poderá configurar preferências de notificação, idioma e outras opções.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
