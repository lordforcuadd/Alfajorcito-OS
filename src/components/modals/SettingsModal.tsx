import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Settings,
  Sparkles,
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  CheckCircle2,
  FolderDown,
  ShieldCheck,
  Key,
  ExternalLink,
  User,
  GraduationCap,
  Award
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input, Select, TextArea } from '../common/Input';
import { db, initializeDatabaseSeed, clearAllDatabaseData } from '../../db';
import { exportVaultZip } from '../../utils/obsidianExporter';
import { testAIConnection } from '../../services/aiService';
import { useToast } from '../common/Toast';
import type { AISettings, ObsidianSettings, UserProfile, CitationStyle } from '../../types';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'ai' | 'obsidian' | 'data'>('profile');

  // AI State
  const [aiProvider, setAiProvider] = useState<AISettings['provider']>('offline_heuristics');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModel, setAiModel] = useState('gemini-1.5-flash');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');

  // Obsidian State
  const [obsidianRestApi, setObsidianRestApi] = useState(false);
  const [obsidianToken, setObsidianToken] = useState('');
  const [obsidianEndpoint, setObsidianEndpoint] = useState('http://127.0.0.1:27124');
  const [obsidianFolder, setObsidianFolder] = useState('Alfajorcito OS/Notes');

  // Confirmation States
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [isConfirmSeedOpen, setIsConfirmSeedOpen] = useState(false);

  // Profile State (USMP Psicología)
  const [userName, setUserName] = useState('Saory');
  const [userInstitution, setUserInstitution] = useState('Universidad de San Martín de Porres (USMP)');
  const [userFaculty, setUserFaculty] = useState('Facultad de Ciencias de la Comunicación, Turismo y Psicología');
  const [userMajor, setUserMajor] = useState('Psicología');
  const [userCycle, setUserCycle] = useState('VIII Ciclo (8vo Ciclo)');
  const [userSpecialty, setUserSpecialty] = useState<UserProfile['specialty']>('CLINICA');
  const [userThesis, setUserThesis] = useState('Regulación Emocional, Autoeficacia Académica y Sintomatología Ansiosa en Estudiantes de la USMP');
  const [userInternship, setUserInternship] = useState('Sedes de Internado USMP (Hospitales MINSA/EsSalud / CSMC / Empresas) (9no Ciclo)');
  const [userCitationStyle, setUserCitationStyle] = useState<CitationStyle>('APA_7');

  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestAI = async () => {
    setIsTestingAi(true);
    setTestResult(null);
    try {
      const res = await testAIConnection({
        provider: aiProvider,
        apiKey: aiApiKey.trim(),
        modelName: aiModel.trim(),
        ollamaEndpoint: ollamaUrl.trim()
      });
      setTestResult(res);
      showToast(
        res.success ? 'Conexión Exitosa' : 'Aviso de Conexión',
        res.message,
        res.success ? 'success' : 'warning'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({ success: false, message: msg });
    } finally {
      setIsTestingAi(false);
    }
  };

  // Load existing settings
  const settingsRecords = useLiveQuery(() => db.settings.toArray());

  useEffect(() => {
    if (settingsRecords) {
      const envKey = ((import.meta as unknown) as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY || '';
      const ai = settingsRecords.find((s) => s.key === 'ai_settings')?.value as AISettings | undefined;
      if (ai) {
        setAiProvider(ai.provider || (envKey ? 'gemini' : 'offline_heuristics'));
        setAiApiKey(ai.apiKey || envKey);
        setAiModel(ai.modelName || 'gemini-2.5-flash');
        setOllamaUrl(ai.ollamaEndpoint || 'http://localhost:11434');
      } else if (envKey) {
        setAiProvider('gemini');
        setAiApiKey(envKey);
        setAiModel('gemini-2.5-flash');
      }

      const obs = settingsRecords.find((s) => s.key === 'obsidian_settings')?.value as ObsidianSettings | undefined;
      if (obs) {
        setObsidianRestApi(obs.restApiEnabled || false);
        setObsidianToken(obs.restApiToken || '');
        setObsidianEndpoint(obs.restApiEndpoint || 'http://127.0.0.1:27124');
        setObsidianFolder(obs.defaultParaFolder || 'Alfajorcito OS/Notes');
      }

      const prof = settingsRecords.find((s) => s.key === 'user_profile')?.value as UserProfile | undefined;
      if (prof) {
        setUserName(prof.name || 'Saory');
        setUserInstitution(prof.institution || 'Universidad de San Martín de Porres (USMP)');
        setUserFaculty(prof.faculty || 'Facultad de Ciencias de la Comunicación, Turismo y Psicología');
        setUserMajor(prof.major || 'Psicología');
        setUserCycle(String(prof.currentCycle || 'VIII Ciclo (8vo Ciclo)'));
        setUserSpecialty(prof.specialty || 'CLINICA');
        setUserThesis(prof.thesisTitle || '');
        setUserInternship(prof.internshipSite || '');
        setUserCitationStyle(prof.defaultCitationStyle || 'APA_7');
      }
    }
  }, [settingsRecords]);

  // Save Profile
  const handleSaveProfile = async () => {
    if (!userName.trim()) {
      showToast('Nombre requerido', 'Ingresa tu nombre para los encabezados.', 'warning');
      return;
    }
    await db.settings.put({
      key: 'user_profile',
      value: {
        name: userName.trim(),
        institution: userInstitution.trim(),
        faculty: userFaculty.trim(),
        major: userMajor.trim(),
        currentCycle: userCycle,
        specialty: userSpecialty,
        thesisTitle: userThesis.trim(),
        internshipSite: userInternship.trim(),
        defaultCitationStyle: userCitationStyle
      } as UserProfile,
      updatedAt: Date.now()
    });
    showToast('Perfil actualizado', 'Datos de portada y encabezados APA 7 guardados.', 'success');
    onClose();
  };

  // Save AI Settings
  const handleSaveAISettings = async () => {
    await db.settings.put({
      key: 'ai_settings',
      value: {
        provider: aiProvider,
        apiKey: aiApiKey.trim(),
        modelName: aiModel.trim(),
        ollamaEndpoint: ollamaUrl.trim()
      } as AISettings,
      updatedAt: Date.now()
    });
    showToast('IA configurada', 'Ajustes del proveedor de IA guardados.', 'success');
    onClose();
  };

  // Save Obsidian Settings
  const handleSaveObsidianSettings = async () => {
    await db.settings.put({
      key: 'obsidian_settings',
      value: {
        restApiEnabled: obsidianRestApi,
        restApiToken: obsidianToken.trim(),
        restApiEndpoint: obsidianEndpoint.trim() || 'http://127.0.0.1:27124',
        defaultParaFolder: obsidianFolder.trim() || 'Alfajorcito OS/Notes'
      } as ObsidianSettings,
      updatedAt: Date.now()
    });
    showToast('Obsidian configurado', 'Ajustes de sincronización guardados.', 'success');
    onClose();
  };

  // Export JSON Backup
  const handleExportJsonBackup = async () => {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      courses: await db.courses.toArray(),
      works: await db.works.toArray(),
      sources: await db.sources.toArray(),
      ideas: await db.ideas.toArray(),
      paraphrases: await db.paraphrases.toArray(),
      citations: await db.citations.toArray(),
      notes: await db.notes.toArray(),
      concepts: await db.concepts.toArray(),
      tasks: await db.tasks.toArray(),
      inquiries: await db.inquiries.toArray(),
      settings: await db.settings.toArray()
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Alfajorcito_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Copia generada', 'Archivo JSON descargado exitosamente.', 'success');
  };

  // Import JSON Backup with Strict Schema Validation
  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (typeof data !== 'object' || data === null) {
        throw new Error('Formato inválido');
      }

      const isValidEntityArray = <T extends { id: string }>(arr: unknown): arr is T[] =>
        Array.isArray(arr) && arr.every(item => item && typeof item === 'object' && typeof (item as Record<string, unknown>).id === 'string');

      if (isValidEntityArray(data.courses)) await db.courses.bulkPut(data.courses);
      if (isValidEntityArray(data.works)) await db.works.bulkPut(data.works);
      if (isValidEntityArray(data.sources)) await db.sources.bulkPut(data.sources);
      if (isValidEntityArray(data.ideas)) await db.ideas.bulkPut(data.ideas);
      if (isValidEntityArray(data.paraphrases)) await db.paraphrases.bulkPut(data.paraphrases);
      if (isValidEntityArray(data.citations)) await db.citations.bulkPut(data.citations);
      if (isValidEntityArray(data.notes)) await db.notes.bulkPut(data.notes);
      if (isValidEntityArray(data.concepts)) await db.concepts.bulkPut(data.concepts);
      if (isValidEntityArray(data.tasks)) await db.tasks.bulkPut(data.tasks);
      if (isValidEntityArray(data.inquiries)) await db.inquiries.bulkPut(data.inquiries);
      if (Array.isArray(data.settings) && data.settings.every((s: unknown) => s && typeof s === 'object' && typeof (s as Record<string, unknown>).key === 'string')) {
        await db.settings.bulkPut(data.settings);
      }

      showToast('Copia restaurada', 'Todos los datos se han importado correctamente.', 'success');
      onClose();
    } catch {
      showToast('Error de importación', 'El archivo no contiene un esquema de datos válido.', 'error');
    }
  };

  // Export Obsidian ZIP
  const handleExportObsidianZip = async () => {
    setIsExportingZip(true);
    try {
      const [notes, sources, works, courses, concepts] = await Promise.all([
        db.notes.toArray(),
        db.sources.toArray(),
        db.works.toArray(),
        db.courses.toArray(),
        db.concepts.toArray()
      ]);

      const zipBlob = await exportVaultZip(notes, sources, works, courses, concepts);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Alfajorcito_Obsidian_Vault_${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Vault generado', 'Archivo .zip listo para abrir en Obsidian.', 'success');
    } catch {
      showToast('Error', 'No se pudo generar el Vault.', 'error');
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configuración & Perfil Académico"
      subtitle="Gestión de perfil Psicología USMP, IA, Obsidian y copias de seguridad"
      maxWidth="xl"
    >
      {/* Sub Tabs */}
      <div
        onWheel={(e) => {
          if (e.deltaY !== 0) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
        className="flex items-center gap-1 sm:gap-1.5 tab-scroll-pc pb-2 mb-3 border-b border-[#EBE5DF] shrink-0"
      >
        {[
          { id: 'profile', label: 'Perfil USMP', icon: <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D98880]" /> },
          { id: 'ai', label: 'IA (BYOK)', icon: <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#B39DDB]" /> },
          { id: 'obsidian', label: 'Obsidian', icon: <FolderDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#80CBC4]" /> },
          { id: 'data', label: 'Copia & Datos', icon: <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFCC80]" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'profile' | 'ai' | 'obsidian' | 'data')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ? 'bg-[#FDF2F0] text-[#8C3A32] border border-[#E8A598]/60 shadow-xs'
                : 'text-[#5A6275] hover:bg-[#F5F1EB]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 0. User Profile (Psicología USMP) */}
      {activeTab === 'profile' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#FDF2F0] to-[#F3E5F5] border border-[#E8A598]/50 space-y-1">
            <span className="font-bold text-xs text-[#8C3A32] flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#D98880]" />
              <span>Estudiante de la Facultad de Ciencias de la Comunicación, Turismo y Psicología - USMP</span>
            </span>
            <p className="text-xs text-[#5A6275] leading-relaxed">
              Configura tu información académica para personalizar los encabezados de tesis, portadas institucionales, consultas con docentes y el plan de Internado I y II.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nombre de la Estudiante"
              placeholder="e.g. Saory"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
            <Input
              label="Universidad"
              placeholder="Universidad de San Martín de Porres (USMP)"
              value={userInstitution}
              onChange={(e) => setUserInstitution(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Facultad"
              placeholder="Facultad de Psicología"
              value={userFaculty}
              onChange={(e) => setUserFaculty(e.target.value)}
            />

            <Select
              label="Ciclo Actual"
              value={userCycle}
              onChange={(e) => setUserCycle(e.target.value)}
            >
              <option value="I Ciclo">I Ciclo (1er Ciclo)</option>
              <option value="II Ciclo">II Ciclo (2do Ciclo)</option>
              <option value="III Ciclo">III Ciclo (3er Ciclo)</option>
              <option value="IV Ciclo">IV Ciclo (4to Ciclo)</option>
              <option value="V Ciclo">V Ciclo (5to Ciclo)</option>
              <option value="VI Ciclo">VI Ciclo (6to Ciclo)</option>
              <option value="VII Ciclo">VII Ciclo (7mo Ciclo)</option>
              <option value="VIII Ciclo (8vo Ciclo)">VIII Ciclo (8vo Ciclo)</option>
              <option value="IX Ciclo (9no Ciclo - Internado I)">IX Ciclo (9no Ciclo - Internado I)</option>
              <option value="X Ciclo (10mo Ciclo - Internado II & Tesis)">X Ciclo (10mo Ciclo - Internado II & Tesis)</option>
            </Select>

            <Select
              label="Área de Especialidad"
              value={userSpecialty}
              onChange={(e) => setUserSpecialty(e.target.value as UserProfile['specialty'])}
            >
              <option value="CLINICA">Psicología Clínica y de la Salud</option>
              <option value="EDUCATIVA">Psicología Educativa</option>
              <option value="ORGANIZACIONAL">Psicología Organizacional</option>
              <option value="SOCIAL_COMUNITARIA">Psicología Social-Comunitaria</option>
            </Select>
          </div>

          <Input
            label="Tema / Título del Proyecto de Tesis (Taller de Tesis I / II / III)"
            placeholder="e.g. Regulación Emocional y Autoeficacia en Universitarios de Lima"
            value={userThesis}
            onChange={(e) => setUserThesis(e.target.value)}
          />

          <Input
            label="Sede / Proyecto de Internado (9no y 10mo Ciclo)"
            placeholder="e.g. Hospital Nacional / Centro de Salud Mental Comunitaria (CSMC)"
            value={userInternship}
            onChange={(e) => setUserInternship(e.target.value)}
          />

          <div className="pt-2 flex flex-col sm:flex-row sm:justify-end">
            <Button variant="primary" onClick={handleSaveProfile} className="w-full sm:w-auto">
              Guardar Perfil Académico
            </Button>
          </div>
        </div>
      )}

      {/* 1. AI Settings */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-[#FDF2F0] border border-[#E8A598]/40 text-xs text-[#5A6275] space-y-1">
            <div className="font-bold text-[#8C3A32] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#D98880]" />
              <span>Privacidad & Regla Anti-Alucinación</span>
            </div>
            <p>
              Tus llaves de API se almacenan <strong>exclusivamente en tu navegador local (IndexedDB)</strong> y se conectan directamente con el proveedor sin intermediarios. Si no configuras una API key, el <strong>Motor Heurístico Offline</strong> ejecutará el análisis localmente sin coste.
            </p>
          </div>

          <Select
            label="Proveedor de Inteligencia Artificial"
            value={aiProvider}
            onChange={(e) => setAiProvider(e.target.value as AISettings['provider'])}
          >
            <option value="offline_heuristics">Heurístico Offline Integrado (Sin API Key / 100% Privado)</option>
            <option value="gemini">Google Gemini (Gemini 1.5 Flash / Pro)</option>
            <option value="openai">OpenAI (GPT-4o-mini / GPT-4o)</option>
            <option value="openrouter">OpenRouter (Llama 3.3, DeepSeek R1, Claude)</option>
            <option value="ollama">Ollama Local (http://localhost:11434)</option>
          </Select>

          {aiProvider !== 'offline_heuristics' && aiProvider !== 'ollama' && (
            <Input
              label="API Key Personal (BYOK)"
              type="password"
              placeholder="Ingresa tu API Key secreta"
              value={aiApiKey}
              onChange={(e) => setAiApiKey(e.target.value)}
              leftIcon={<Key className="w-4 h-4" />}
            />
          )}

          {aiProvider === 'ollama' && (
            <Input
              label="Endpoint de Ollama"
              placeholder="http://localhost:11434"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
            />
          )}

          {aiProvider !== 'offline_heuristics' && (
            <Input
              label="Nombre del Modelo"
              placeholder="e.g. gemini-2.0-flash, gemini-1.5-flash, gpt-4o-mini"
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
            />
          )}

          {testResult && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-start gap-2 border animate-fade-in ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}
            >
              <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${testResult.success ? 'text-emerald-600' : 'text-rose-600'}`} />
              <div className="min-w-0 flex-1">
                <span className="font-bold block">{testResult.success ? 'Conexión Exitosa' : 'Aviso de Conexión'}</span>
                <span className="leading-relaxed opacity-90">{testResult.message}</span>
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
            {aiProvider !== 'offline_heuristics' && (
              <Button
                variant="secondary"
                onClick={handleTestAI}
                isLoading={isTestingAi}
                icon={<Sparkles className="w-4 h-4 text-[#D98880]" />}
                className="w-full sm:w-auto"
              >
                Probar Conexión
              </Button>
            )}
            <Button variant="primary" onClick={handleSaveAISettings} className="w-full sm:w-auto ml-auto">
              Guardar Configuración de IA
            </Button>
          </div>
        </div>
      )}

      {/* 2. Obsidian Settings */}
      {activeTab === 'obsidian' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-[#EBE5DF] space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#2B2D42]">Exportador Universal de Vault (.zip)</h4>
                <p className="text-xs text-[#5A6275] mt-0.5">
                  Descarga un paquete ZIP estructurado según la metodología PARA y Zettelkasten con todas tus notas, fichas de fuentes y trabajos con frontmatter YAML compatible con Obsidian.
                </p>
              </div>
            </div>
            <Button
              variant="lavender"
              onClick={handleExportObsidianZip}
              isLoading={isExportingZip}
              icon={<FolderDown className="w-4 h-4" />}
            >
              Exportar Vault a Obsidian (.zip)
            </Button>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#EBE5DF] space-y-3 opacity-90">
            <div>
              <h4 className="font-bold text-sm text-[#2B2D42]">Obsidian Local REST API (Avanzado)</h4>
              <p className="text-xs text-[#5A6275] mt-0.5">
                Sincronización en tiempo real con el plugin 'Local REST API' de Obsidian.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Endpoint Local"
                placeholder="http://127.0.0.1:27124"
                value={obsidianEndpoint}
                onChange={(e) => setObsidianEndpoint(e.target.value)}
              />
              <Input
                label="Carpeta Destino en el Vault"
                placeholder="Alfajorcito OS/Notes"
                value={obsidianFolder}
                onChange={(e) => setObsidianFolder(e.target.value)}
              />
            </div>
            <Input
              label="Token de Autorización de Obsidian"
              type="password"
              placeholder="Bearer Token de Local REST API"
              value={obsidianToken}
              onChange={(e) => setObsidianToken(e.target.value)}
            />
            <div className="pt-2 flex justify-end">
              <Button variant="primary" size="sm" onClick={handleSaveObsidianSettings} className="font-bold">
                Guardar Ajustes de Obsidian
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Data & Backup */}
      {activeTab === 'data' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Export JSON */}
            <div className="p-4 rounded-2xl bg-white border border-[#EBE5DF] space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#2B2D42]">Copia de Seguridad Completa</h4>
                <p className="text-xs text-[#5A6275] mt-1">
                  Guarda un archivo JSON con todos tus cursos, trabajos, fuentes, citas, notas y configuraciones.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportJsonBackup}
                icon={<Download className="w-4 h-4" />}
              >
                Descargar Backup (.json)
              </Button>
            </div>

            {/* Import JSON */}
            <div className="p-4 rounded-2xl bg-white border border-[#EBE5DF] space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#2B2D42]">Restaurar Copia</h4>
                <p className="text-xs text-[#5A6275] mt-1">
                  Restaura una base de datos guardada previamente en formato JSON.
                </p>
              </div>
              <label className="inline-flex items-center justify-center font-medium rounded-xl text-xs px-3 py-1.5 min-h-[36px] gap-1.5 bg-white hover:bg-[#F5F1EB] text-[#2B2D42] border border-[#EBE5DF] shadow-xs cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Subir Archivo (.json)</span>
                <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
              </label>
            </div>
          </div>

          {/* Database Reset & Management */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Clear all data (0 records) */}
            <div className="p-4 rounded-2xl bg-[#FFF5F5] border border-[#FFCDD2] space-y-2 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs text-[#C62828] flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Vaciar Toda la Base de Datos (0 Datos)</span>
                </h4>
                <p className="text-xs text-[#5A6275] mt-1 leading-relaxed">
                  Elimina todos los cursos, trabajos, fuentes, notas y tareas para iniciar desde cero y probar el sistema completamente en blanco.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsConfirmClearOpen(true)}
                icon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Limpiar Todo (Dejar en Blanco)
              </Button>
            </div>

            {/* Reload Demo Data */}
            <div className="p-4 rounded-2xl bg-[#FFF8E1] border border-[#FFCC80]/60 space-y-2 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs text-[#795548] flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Recargar Semillas de Ejemplo (Psicología USMP)</span>
                </h4>
                <p className="text-xs text-[#5A6275] mt-1 leading-relaxed">
                  Restaura los cursos de 8vo Ciclo, tesis de regulación emocional, fuentes indexadas y notas de ejemplo.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsConfirmSeedOpen(true)}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Recargar Semillas USMP
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clear All */}
      {isConfirmClearOpen && (
        <Modal
          isOpen={isConfirmClearOpen}
          onClose={() => setIsConfirmClearOpen(false)}
          title="¿Confirmar vaciado total de la base de datos?"
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-[#5A6275] leading-relaxed">
              Esta acción eliminará de forma irreversible todas las notas, trabajos, fuentes y tareas registradas localmente en este navegador.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#EBE5DF]">
              <Button variant="ghost" onClick={() => setIsConfirmClearOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  await clearAllDatabaseData();
                  setIsConfirmClearOpen(false);
                  showToast('Base vaciada', 'Se han eliminado todos los datos. La aplicación está lista en blanco.', 'info');
                  onClose();
                }}
              >
                Sí, vaciar base de datos
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal for Reload Seeds */}
      {isConfirmSeedOpen && (
        <Modal
          isOpen={isConfirmSeedOpen}
          onClose={() => setIsConfirmSeedOpen(false)}
          title="¿Recargar datos de ejemplo de Psicología USMP?"
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-[#5A6275] leading-relaxed">
              Se restaurarán las materias de VIII Ciclo, la tesis de prueba y fuentes de psicología de la USMP. Los datos actuales no guardados se sobrescribirán.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#EBE5DF]">
              <Button variant="ghost" onClick={() => setIsConfirmSeedOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  await clearAllDatabaseData();
                  await initializeDatabaseSeed(true);
                  setIsConfirmSeedOpen(false);
                  showToast('Semillas restauradas', 'Datos de ejemplo de psicología USMP cargados.', 'success');
                  onClose();
                }}
              >
                Sí, recargar semillas
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};
