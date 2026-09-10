import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  FlaskConical,
  ScanText,
  Scissors,
  ShieldCheck,
  SpellCheck,
  Copy,
  Check,
  Loader2,
  CircleAlert,
  FileText,
  Lightbulb,
  RotateCcw,
  Wand2
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../components/common/Toast';
import { copyText } from '../../utils/clipboardHelper';
import {
  detectAIAuthorship,
  paraphraseText,
  checkPlagiarism,
  correctSpelling,
  humanizeText
} from '../../services/textLabService';
import {
  PARAPHRASE_PRESETS,
  detectAIText,
  AI_VERDICT_LABELS,
  type ParaphraseIntensity
} from '../../utils/textLabEngine';
import type {
  AIDetectionLLMResult,
  HumanizeResult,
  ParaphraseResult,
  SpellcheckResult
} from '../../utils/textLabEngine';
import type { PlagiarismScanReport } from '../../services/textLabService';

type LabTool = 'detector' | 'paraphraser' | 'plagiarism' | 'spellcheck' | 'humanizer';

interface TextLabViewProps {
  initialTool?: LabTool;
}

const TOOLS: Array<{
  id: LabTool;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  cta: string;
}> = [
  {
    id: 'detector',
    label: 'Detector de IA',
    shortLabel: 'IA',
    description: '¿Tu texto pasa por humano ante GPTZero, Pangram o QuillBot? Verifícalo antes de entregar.',
    icon: ScanText,
    cta: 'Analizar texto'
  },
  {
    id: 'humanizer',
    label: 'Humanizador',
    shortLabel: 'Humanizar',
    description: 'Reescribe tu texto con las estrategias que lograron 0% en detectores sobre una tesis real.',
    icon: Wand2,
    cta: 'Humanizar texto'
  },
  {
    id: 'paraphraser',
    label: 'Parafraseo',
    shortLabel: 'Paráfrasis',
    description: 'Reformula párrafos con fidelidad académica en tres niveles de intensidad.',
    icon: Scissors,
    cta: 'Parafrasear'
  },
  {
    id: 'plagiarism',
    label: 'Detector de Plagio',
    shortLabel: 'Plagio',
    description: 'Contrasta tu texto contra tus fuentes y notas guardadas en Alfajorcito.',
    icon: ShieldCheck,
    cta: 'Buscar coincidencias'
  },
  {
    id: 'spellcheck',
    label: 'Corrector',
    shortLabel: 'Corrector',
    description: 'Ortografía, tildes y gramática académica sin cambiar tu voz.',
    icon: SpellCheck,
    cta: 'Corregir texto'
  }
];

export const TextLabView: React.FC<TextLabViewProps> = ({ initialTool = 'detector' }) => {
  const { showToast } = useToast();
  const [activeTool, setActiveTool] = useState<LabTool>(initialTool);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Results per tool
  const [aiResult, setAiResult] = useState<AIDetectionLLMResult | null>(null);
  const [aiHeuristic, setAiHeuristic] = useState<ReturnType<typeof detectAIText> | null>(null);
  const [paraResult, setParaResult] = useState<ParaphraseResult | null>(null);
  const [paraIntensity, setParaIntensity] = useState<ParaphraseIntensity>('BALANCED');
  const [plagResult, setPlagResult] = useState<PlagiarismScanReport | null>(null);
  const [spellResult, setSpellResult] = useState<SpellcheckResult | null>(null);
  const [humanResult, setHumanResult] = useState<HumanizeResult | null>(null);

  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordCount = useMemo(
    () => (inputText.trim() ? inputText.trim().split(/\s+/).length : 0),
    [inputText]
  );

  const handleCopy = async (text: string) => {
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      showToast('Copiado', 'Texto copiado al portapapeles.', 'success');
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } else {
      showToast('Error', 'No se pudo copiar el texto.', 'error');
    }
  };

  // Audit 2026-09-09: clear the pending "copied" reset timer on unmount —
  // the component previously had no useEffect at all, so leaving the tab
  // within 2s of copying fired setCopied on an unmounted component.
  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const resetResults = () => {
    setAiResult(null);
    setAiHeuristic(null);
    setParaResult(null);
    setPlagResult(null);
    setSpellResult(null);
    setHumanResult(null);
  };

  const clearAll = () => {
    setInputText('');
    resetResults();
  };

  const switchTool = (tool: LabTool) => {
    if (tool === activeTool) return;
    setActiveTool(tool);
    resetResults();
  };

  // ─── Tool runners (each wrapped: DB or network may fail) ───

  const runDetector = async () => {
    if (inputText.trim().length < 120) {
      showToast('Texto muy corto', 'Pega al menos 120 caracteres para un análisis confiable.', 'warning');
      return;
    }
    setIsProcessing(true);
    setAiResult(null);
    setAiHeuristic(null);
    try {
      setAiHeuristic(detectAIText(inputText));
      const res = await detectAIAuthorship(inputText);
      setAiResult(res);
    } catch {
      showToast('Error', 'No se pudo completar el análisis de detección.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const runParaphraser = async () => {
    if (inputText.trim().length < 40) {
      showToast('Texto muy corto', 'Pega al menos una oración completa para parafrasear.', 'warning');
      return;
    }
    setIsProcessing(true);
    setParaResult(null);
    try {
      const res = await paraphraseText(inputText, paraIntensity);
      setParaResult(res);
      if (res.isOfflineHeuristic) {
        showToast(
          'Modo offline',
          'Sin API key configurada: parafraseo local básico. Configura tu IA en Ajustes para resultados profesionales.',
          'info'
        );
      }
    } catch {
      showToast('Error', 'No se pudo parafrasear el texto.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const runPlagiarism = async () => {
    if (inputText.trim().length < 60) {
      showToast('Texto muy corto', 'Pega al menos un párrafo para el análisis de plagio.', 'warning');
      return;
    }
    setIsProcessing(true);
    setPlagResult(null);
    try {
      const res = await checkPlagiarism(inputText);
      setPlagResult(res);
      if (res.matches.length === 0) {
        showToast('Sin corpus local', 'Guarda fuentes y notas en la app para que el detector tenga contra qué comparar.', 'info');
      }
    } catch {
      showToast('Error', 'No se pudo completar el análisis de plagio.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const runSpellcheck = async () => {
    if (inputText.trim().length < 20) {
      showToast('Texto muy corto', 'Pega texto para corregir.', 'warning');
      return;
    }
    setIsProcessing(true);
    setSpellResult(null);
    try {
      const res = await correctSpelling(inputText);
      setSpellResult(res);
      if (res.isOfflineHeuristic) {
        showToast(
          'Modo offline',
          'Corrección local limitada al diccionario de errores frecuentes. Configura tu IA en Ajustes para corrección completa.',
          'info'
        );
      }
    } catch {
      showToast('Error', 'No se pudo corregir el texto.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const runHumanizer = async () => {
    if (inputText.trim().length < 120) {
      showToast('Texto muy corto', 'Pega al menos 120 caracteres para humanizar.', 'warning');
      return;
    }
    setIsProcessing(true);
    setHumanResult(null);
    try {
      const res = await humanizeText(inputText);
      setHumanResult(res);
      if (res.isOfflineHeuristic) {
        showToast(
          'Modo offline',
          'Humanización local básica (solo léxico). Para reestructurar ritmo y sintaxis configura tu IA en Ajustes.',
          'info'
        );
      } else {
        const leftover = res.remainingRisks.find((r) => r.includes('Verificación local'));
        showToast(
          leftover ? 'Humanizado con avisos' : 'Texto humanizado',
          leftover
            ? 'El texto mejoró pero quedan algunos patrones. Revisa los avisos del resultado.'
            : 'Reescritura completada y verificada contra el detector local.',
          leftover ? 'warning' : 'success'
        );
      }
    } catch {
      showToast('Error', 'No se pudo humanizar el texto.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const currentRunner: Record<LabTool, () => Promise<void>> = {
    detector: runDetector,
    paraphraser: runParaphraser,
    plagiarism: runPlagiarism,
    spellcheck: runSpellcheck,
    humanizer: runHumanizer
  };

  const activeToolMeta = TOOLS.find((t) => t.id === activeTool)!;

  // QuillBot-style three-way split, blending LLM verdict with local detection.
  const aiSplit = useMemo(() => {
    if (!aiHeuristic) return null;
    const local = aiHeuristic.distribution;
    if (!aiResult) return local;
    // Blend: LLM verdict shifts the AI/human masses, local keeps granularity.
    const verdictAi = aiResult.verdict === 'IA' ? 0.9 : aiResult.verdict === 'MIXTO' ? 0.5 : 0.1;
    const ai = Math.round(local.ai * 0.5 + verdictAi * 100 * 0.5);
    const mixed = Math.round(local.mixed * 0.5);
    const human = Math.max(0, 100 - ai - mixed);
    return { ai, mixed, human };
  }, [aiResult, aiHeuristic]);

  // Result text for copy actions (paraphraser/spellcheck/humanizer outputs)
  const currentOutputText = useMemo(() => {
    switch (activeTool) {
      case 'paraphraser':
        return paraResult?.text;
      case 'spellcheck':
        return spellResult?.correctedText;
      case 'humanizer':
        return humanResult?.text;
      default:
        return undefined;
    }
  }, [activeTool, paraResult, spellResult, humanResult]);

  // ─── UI atoms ───

  const VerdictBar = ({
    label,
    pct,
    color,
    desc
  }: {
    label: string;
    pct: number;
    color: string;
    desc: string;
  }) => (
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline justify-between gap-1 mb-1">
        <p className="text-[10px] sm:text-[11px] font-bold text-[#2B2D42] leading-tight truncate">{label}</p>
        <p className={`text-sm sm:text-lg font-black ${color} shrink-0 tabular-nums`}>{pct}%</p>
      </div>
      <div className="h-2 rounded-full bg-[#F5F1EB] overflow-hidden">
        <div
          className={`h-full rounded-full ${color.replace('text-', 'bg-')} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[9px] text-[#5A6275] mt-0.5 leading-tight hidden sm:block">{desc}</p>
    </div>
  );

  const sentenceTone = (band: 'HUMANO' | 'MIXTO' | 'IA') =>
    band === 'IA'
      ? 'bg-rose-50/80 text-rose-900 border-l-2 border-rose-300'
      : band === 'MIXTO'
        ? 'bg-amber-50/80 text-amber-900 border-l-2 border-amber-300'
        : 'bg-emerald-50/60 text-emerald-950/80 border-l-2 border-emerald-200';

  // ─── Render ───

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header — Alfajorcito style: icon tile + title + subtitle */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-[#FDF2F0] border border-[#E8A598]/60 flex items-center justify-center shrink-0 shadow-2xs">
          <FlaskConical className="w-5.5 h-5.5 text-[#8C3A32]" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#2B2D42]">
            Laboratorio de Texto
          </h1>
          <p className="text-xs sm:text-sm text-[#5A6275] leading-relaxed">
            Analiza, corrige y humaniza tus textos académicos sin salir de Alfajorcito — con la IA ya
            configurada en Ajustes.
          </p>
        </div>
      </div>

      {/* Tool selector — segmented pills like the rest of the app */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {TOOLS.map((tool) => {
          const isActive = activeTool === tool.id;
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => switchTool(tool.id)}
              title={tool.label}
              aria-pressed={isActive}
              aria-label={tool.label}
              className={`flex flex-col items-center justify-center gap-1 px-1 py-2.5 rounded-2xl border transition-all cursor-pointer text-center min-h-[64px] ${
                isActive
                  ? 'bg-[#FDF2F0] border-[#E8A598]/70 shadow-2xs text-[#8C3A32] scale-[1.02]'
                  : 'bg-white border-[#EBE5DF] text-[#5A6275] hover:bg-[#F5F1EB] hover:text-[#2B2D42] hover:border-[#E8A598]/40'
              }`}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              <span className="text-[9px] sm:text-[10px] font-bold leading-tight">{tool.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Active tool description strip */}
      <div className="flex items-start gap-2 px-1">
        <Lightbulb className="w-3.5 h-3.5 text-[#E8A598] shrink-0 mt-0.5" />
        <p className="text-[11px] sm:text-xs text-[#5A6275] leading-relaxed">{activeToolMeta.description}</p>
      </div>

      {/* Input card */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <label htmlFor="textlab-input" className="text-xs font-extrabold text-[#2B2D42] uppercase tracking-wider">
            Tu texto
          </label>
          <div className="flex items-center gap-2">
            {wordCount > 0 && (
              <Badge variant="default" size="sm">{wordCount} palabras</Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Limpiar
            </Button>
          </div>
        </div>
        <textarea
          id="textlab-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Pega aquí el texto a procesar..."
          rows={7}
          disabled={isProcessing}
          className="w-full text-sm text-[#2B2D42] placeholder:text-[#5A6275]/60 bg-[#FAF8F5] border border-[#EBE5DF] rounded-2xl px-3.5 py-3 focus:outline-none focus:border-[#E8A598] focus:ring-1 focus:ring-[#E8A598]/40 resize-y leading-relaxed disabled:opacity-60 transition-colors"
        />
        <div className="flex items-center justify-end mt-3">
          <Button
            variant="primary"
            size="sm"
            onClick={currentRunner[activeTool]}
            isLoading={isProcessing}
            icon={<Loader2 className={`w-4 h-4 ${isProcessing ? 'hidden' : ''}`} />}
            className="shrink-0"
          >
            {isProcessing ? 'Procesando...' : activeToolMeta.cta}
          </Button>
        </div>
      </Card>

      {/* ══ DETECTOR: QuillBot-style three-bar breakdown ══ */}
      {activeTool === 'detector' && aiHeuristic && (
        <>
          {/* Three-bar breakdown (QuillBot layout) */}
          <Card>
            <h3 className="text-xs font-extrabold text-[#2B2D42] uppercase tracking-wider mb-3">
              Resultado de detección
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <VerdictBar
                label="Generado por IA"
                pct={aiSplit?.ai ?? 0}
                color="text-rose-600"
                desc="Probablemente salió de un modelo"
              />
              <VerdictBar
                label="Escrito por personas y pulido por IA"
                pct={aiSplit?.mixed ?? 0}
                color="text-amber-600"
                desc="Mezcla de tramos humanos y de IA"
              />
              <VerdictBar
                label="Escrito por personas"
                pct={aiSplit?.human ?? 0}
                color="text-emerald-600"
                desc="Se lee natural y humano"
              />
            </div>

            {/* Overall verdict + model badge */}
            <div className="mt-4 pt-3 border-t border-[#EBE5DF] flex flex-wrap items-center justify-between gap-2">
              <p
                className={`text-sm font-black ${
                  (aiResult?.verdict ?? aiHeuristic.band) === 'IA'
                    ? 'text-rose-700'
                    : (aiResult?.verdict ?? aiHeuristic.band) === 'MIXTO'
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                }`}
              >
                {AI_VERDICT_LABELS[aiResult?.verdict ?? aiHeuristic.band]}
              </p>
              <div className="flex items-center gap-2">
                {aiResult && (
                  <Badge variant={aiResult.isOfflineHeuristic ? 'default' : 'verified'} size="sm">
                    {aiResult.modelUsed}
                  </Badge>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => switchTool('humanizer')}
                  icon={<Wand2 className="w-3.5 h-3.5" />}
                >
                  Humanizar este texto
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-[#5A6275]/80 mt-2.5 leading-relaxed">
              Los detectores no miden autoría real: miden el parecido estadístico del texto con la
              salida de modelos de IA. Un texto académico formal puede marcar alto aunque lo hayas
              escrito tú. Úsalo como chequeo previo, no como sentencia — y confirma con el Turnitin
              de tu universidad.
            </p>
          </Card>

          {/* Sentence-by-sentence highlight (QuillBot "resaltado") */}
          {aiHeuristic.sentences.length > 0 && (aiSplit?.ai ?? 0) > 0 && (
            <Card>
              <h4 className="text-xs font-extrabold text-[#2B2D42] uppercase tracking-wider mb-2">
                Desglose por oración
              </h4>
              <p className="text-[10px] text-[#5A6275] mb-2.5 leading-relaxed">
                Rojo = patrones de IA · Ámbar = fórmulas sospechosas · Verde = se lee humano. Las
                oraciones rojas son las que debes reescribir primero.
              </p>
              <div className="space-y-1.5 max-h-72 overflow-y-auto tab-scroll-pc pr-1">
                {aiHeuristic.sentences.map((s, i) => (
                  <p
                    key={i}
                    className={`text-xs leading-relaxed rounded-lg px-2.5 py-1.5 ${sentenceTone(s.band)}`}
                  >
                    {s.text}
                  </p>
                ))}
              </div>
            </Card>
          )}

          {/* Detected patterns (actionable list) */}
          {aiHeuristic.issues.length > 0 && (
            <Card>
              <h4 className="text-xs font-extrabold text-[#2B2D42] uppercase tracking-wider mb-2">
                Patrones que disparan detectores ({aiHeuristic.issues.length})
              </h4>
              <div className="space-y-1.5">
                {aiHeuristic.issues.map((issue, i) => (
                  <details key={i} className="text-xs">
                    <summary className="cursor-pointer font-bold text-[#2B2D42] flex items-center gap-1.5">
                      <CircleAlert className="w-3.5 h-3.5 text-[#E8A598] shrink-0" />
                      {issue.label} ({issue.occurrences})
                    </summary>
                    <ul className="ml-5 mt-1 space-y-0.5">
                      {issue.examples.map((ex, j) => (
                        <li key={j} className="text-[#5A6275] font-mono text-[11px]">"{ex}"</li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </Card>
          )}

          {/* Model reasons (when LLM ran) */}
          {aiResult && !aiResult.isOfflineHeuristic && aiResult.reasons.length > 0 && (
            <Card>
              <h4 className="text-xs font-extrabold text-[#2B2D42] uppercase tracking-wider mb-2">
                Análisis del modelo
              </h4>
              <ul className="space-y-1.5">
                {aiResult.reasons.map((r, i) => (
                  <li key={i} className="text-xs text-[#5A6275] leading-relaxed flex items-start gap-1.5">
                    <CircleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#E8A598]" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      {/* ══ HUMANIZER result ══ */}
      {activeTool === 'humanizer' && humanResult && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-extrabold text-[#2B2D42] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#8C3A32]" />
              Texto humanizado
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={humanResult.isOfflineHeuristic ? 'default' : 'verified'} size="sm">
                {humanResult.modelUsed}
              </Badge>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleCopy(humanResult.text)}
                icon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          </div>
          <p className="text-sm text-[#2B2D42] leading-relaxed whitespace-pre-wrap bg-[#FAF8F5] border border-[#EBE5DF] rounded-xl px-3.5 py-3">
            {humanResult.text}
          </p>

          {humanResult.appliedStrategies.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-extrabold text-[#2B2D42] uppercase tracking-wider mb-1.5">
                Estrategias aplicadas
              </p>
              <ul className="space-y-1">
                {humanResult.appliedStrategies.slice(0, 10).map((s, i) => (
                  <li key={i} className="text-[11px] text-[#5A6275] leading-snug flex items-start gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#E8A598]" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {humanResult.remainingRisks.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-extrabold text-[#2B2D42] uppercase tracking-wider mb-1.5">
                Avisos
              </p>
              <ul className="space-y-1">
                {humanResult.remainingRisks.map((r, i) => (
                  <li key={i} className="text-[11px] text-[#5A6275] leading-snug flex items-start gap-1.5">
                    <CircleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-[#EBE5DF] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <p className="text-[10px] text-[#5A6275] leading-snug flex-1">
              Verifica siempre: pega el resultado en el Detector de IA para confirmar que las señales
              bajaron antes de entregar.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setInputText(humanResult.text);
                switchTool('detector');
                setAiHeuristic(detectAIText(humanResult.text));
              }}
              icon={<ScanText className="w-3.5 h-3.5" />}
              className="shrink-0"
            >
              Verificar en Detector
            </Button>
          </div>
        </Card>
      )}

      {/* ══ PARAPHRASER intensity + result ══ */}
      {activeTool === 'paraphraser' && (
        <Card>
          <label className="text-xs font-extrabold text-[#2B2D42] uppercase tracking-wider mb-2 block">
            Intensidad de parafraseo
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PARAPHRASE_PRESETS.map((p) => {
              const isActive = paraIntensity === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setParaIntensity(p.id)}
                  aria-pressed={isActive}
                  title={p.description}
                  className={`px-2 py-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#FDF2F0] border-[#E8A598]/70 text-[#8C3A32] shadow-2xs'
                      : 'bg-white border-[#EBE5DF] text-[#5A6275] hover:bg-[#F5F1EB]'
                  }`}
                >
                  <span className="block text-xs font-extrabold">{p.label}</span>
                  <span className="block text-[9px] leading-tight mt-0.5">{p.description.split('.')[0]}.</span>
                </button>
              );
            })}
          </div>
        </Card>
      )}
      {activeTool === 'paraphraser' && paraResult && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-extrabold text-[#2B2D42] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#8C3A32]" />
              Paráfrasis generada
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={paraResult.isOfflineHeuristic ? 'default' : 'verified'} size="sm">
                {paraResult.modelUsed}
              </Badge>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleCopy(paraResult.text)}
                icon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          </div>
          <p className="text-sm text-[#2B2D42] leading-relaxed whitespace-pre-wrap bg-[#FAF8F5] border border-[#EBE5DF] rounded-xl px-3.5 py-3">
            {paraResult.text}
          </p>
          <p className="text-[10px] text-[#5A6275] mt-2 leading-relaxed">
            Intensidad: {PARAPHRASE_PRESETS.find((p) => p.id === paraResult.intensity)?.label}. Revisa
            siempre la fidelidad conceptual antes de citar, y pasa la paráfrasis por el Detector de
            Plagio para confirmar que se alejó lo suficiente del original.
          </p>
        </Card>
      )}

      {/* ══ PLAGIARISM result ══ */}
      {activeTool === 'plagiarism' && plagResult && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-extrabold text-[#2B2D42] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#8C3A32]" />
              Reporte de similitud
            </h3>
            <Badge variant={plagResult.isOfflineHeuristic ? 'default' : 'verified'} size="sm">
              {plagResult.modelUsed}
            </Badge>
          </div>
          {plagResult.matches.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="w-6 h-6" />}
              title="Sin fuentes para comparar"
              description="El detector contrasta tu texto contra tus fuentes y notas guardadas. Guarda fuentes con abstract en Fuentes & Papers, o notas en el Segundo Cerebro, y vuelve a intentar."
            />
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Badge
                  variant={
                    plagResult.overallScore > 0.4
                      ? 'unverified'
                      : plagResult.overallScore > 0.15
                        ? 'partially_verified'
                        : 'verified'
                  }
                  size="md"
                >
                  Similitud máxima: {(plagResult.overallScore * 100).toFixed(1)}%
                </Badge>
              </div>
              <div className="space-y-1.5">
                {plagResult.matches.slice(0, 8).map((m) => (
                  <div
                    key={m.sourceId}
                    className="flex items-center justify-between gap-2 bg-[#FAF8F5] border border-[#EBE5DF] rounded-xl px-3 py-2"
                  >
                    <p
                      className="text-xs font-bold text-[#2B2D42] truncate min-w-0"
                      title={m.sourceTitle}
                    >
                      {m.sourceTitle}
                    </p>
                    {m.cited && (
                      <Badge variant="partially_verified" size="sm">
                        Citada — score descontado
                      </Badge>
                    )}
                    <Badge
                      variant={
                        m.score > 0.4
                          ? 'unverified'
                          : m.score > 0.15
                            ? 'partially_verified'
                            : 'verified'
                      }
                      size="sm"
                    >
                      {(m.score * 100).toFixed(1)}%
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#5A6275] mt-2.5 leading-relaxed">
                El contraste es local (tus abstracts y notas). No reemplaza el Turnitin institucional:
                úsalo como chequeo previo de paralelismo antes de entregar.
              </p>
              {plagResult.corpusWarning && (
                <p className="text-[10px] text-[#8C3A32] mt-1.5 leading-relaxed font-medium">
                  ⚠ {plagResult.corpusWarning}
                </p>
              )}
            </>
          )}
        </Card>
      )}

      {/* ══ SPELLCHECK result ══ */}
      {activeTool === 'spellcheck' && spellResult && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-extrabold text-[#2B2D42] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#8C3A32]" />
              Texto corregido
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={spellResult.isOfflineHeuristic ? 'default' : 'verified'} size="sm">
                {spellResult.modelUsed}
              </Badge>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleCopy(spellResult.correctedText)}
                icon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          </div>
          <p className="text-sm text-[#2B2D42] leading-relaxed whitespace-pre-wrap bg-[#FAF8F5] border border-[#EBE5DF] rounded-xl px-3.5 py-3">
            {spellResult.correctedText}
          </p>
          {spellResult.corrections.length > 0 ? (
            <div className="mt-3 space-y-1.5">
              <p className="text-[10px] font-extrabold text-[#2B2D42] uppercase tracking-wider">
                Correcciones ({spellResult.corrections.length})
              </p>
              {spellResult.corrections.slice(0, 12).map((c, i) => (
                <div key={i} className="text-xs bg-[#FAF8F5] border border-[#EBE5DF] rounded-xl px-3 py-2">
                  <p className="font-mono text-[11px]">
                    <span className="text-rose-600 line-through">{c.original}</span>
                    {' → '}
                    <span className="text-emerald-700 font-bold">{c.corrected}</span>
                  </p>
                  {c.explanation && (
                    <p className="text-[10px] text-[#5A6275] mt-0.5">{c.explanation}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs text-[#5A6275] leading-relaxed">
                No se encontraron errores ortográficos. Tu texto está limpio.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Idle empty state before first run */}
      {!isProcessing &&
        ((activeTool === 'detector' && !aiHeuristic) ||
          (activeTool === 'paraphraser' && !paraResult) ||
          (activeTool === 'plagiarism' && !plagResult) ||
          (activeTool === 'spellcheck' && !spellResult) ||
          (activeTool === 'humanizer' && !humanResult)) && (
          <EmptyState
            icon={<React.Fragment key={activeTool}><activeToolMeta.icon className="w-6 h-6" /></React.Fragment>}
            title={`${activeToolMeta.label}: pega tu texto arriba`}
            description={activeToolMeta.description}
          />
        )}
    </div>
  );
};
