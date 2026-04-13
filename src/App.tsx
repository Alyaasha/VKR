/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  Camera, 
  ChevronRight, 
  Clock, 
  Eye, 
  Info, 
  Layers, 
  Map as MapIcon, 
  Moon, 
  Navigation, 
  Package, 
  Sun, 
  TrendingUp, 
  Users 
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  Cell 
} from 'recharts';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import { motion, AnimatePresence } from 'motion/react';

// --- Mock Data Generators ---

const generateHourlyData = (isNight: boolean) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return hours.map(h => {
    const base = isNight ? (h > 6 && h < 22 ? 10 : 30) : (h > 8 && h < 20 ? 80 : 20);
    const noise = Math.random() * 10;
    return {
      time: `${h}:00`,
      pedestrians: Math.floor(base + noise),
      couriers: Math.floor(base * 0.4 + noise * 0.5),
      robots: Math.floor(base * 0.1 + noise * 0.2),
      speed: (4 + Math.random() * 2).toFixed(1)
    };
  });
};

const INCIDENTS = [
  { id: 1, type: 'Сближение', object: 'Робот #42', time: '10:12', severity: 'high', desc: 'Дистанция < 0.5м' },
  { id: 2, type: 'Манёвр', object: 'Курьер (СИМ)', time: '10:25', severity: 'medium', desc: 'Резкое торможение' },
  { id: 3, type: 'Зона', object: 'Велосипедист', time: '10:44', severity: 'low', desc: 'Заезд на детскую площадку' },
];

// --- Components ---

const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between"
  >
    <div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold mt-1 text-slate-900">{value}</h3>
      {trend && (
        <span className={`text-xs font-semibold mt-2 inline-block ${trend > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
          {trend > 0 ? '+' : ''}{trend}% к прошлому часу
        </span>
      )}
    </div>
    <div className={`p-2 rounded-lg ${color}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
  </motion.div>
);

export default function App() {
  const [isNight, setIsNight] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedInterval, setSelectedInterval] = useState('15 мин');
  const [galleryFilter, setGalleryFilter] = useState('all');
  const [selectedSnapshot, setSelectedSnapshot] = useState<any>(null);
  const [selectedObjectTypes, setSelectedObjectTypes] = useState<string[]>(['pedestrian', 'courier', 'robot']);

  const OBJECT_TYPES = [
    { id: 'pedestrian', label: 'Пешеходы', color: 'bg-indigo-500' },
    { id: 'courier', label: 'Курьеры', color: 'bg-amber-500' },
    { id: 'robot', label: 'Роботы', color: 'bg-purple-500' },
  ];

  const hourlyData = useMemo(() => generateHourlyData(isNight), [isNight]);

  const dayNightComparisonData = [
    { metric: 'Пешеходы', day: 1450, night: 420 },
    { metric: 'Курьеры', day: 580, night: 150 },
    { metric: 'Роботы', day: 120, night: 85 },
    { metric: 'Инциденты', day: 12, night: 4 },
  ];

  const SNAPSHOTS = [
    { 
      id: 101, type: 'uncertain', confidence: 0.42, time: '10:55', label: 'Неизвестный объект', seed: 'tech1',
      objects: [
        { label: 'Unknown', confidence: 0.42, bbox: [120, 45, 50, 80] },
        { label: 'Pedestrian', confidence: 0.88, bbox: [200, 100, 30, 60] }
      ],
      incident: null
    },
    { 
      id: 102, type: 'violation', confidence: 0.98, time: '10:52', label: 'Превышение скорости', seed: 'bike1',
      objects: [
        { label: 'Courier (Bike)', confidence: 0.98, bbox: [300, 150, 80, 120] }
      ],
      incident: { type: 'Speeding', value: '24 km/h', limit: '15 km/h', severity: 'high' }
    },
    { 
      id: 103, type: 'normal', confidence: 0.99, time: '10:50', label: 'Нормальный поток', seed: 'street1',
      objects: [
        { label: 'Pedestrian', confidence: 0.99, bbox: [50, 200, 40, 90] },
        { label: 'Pedestrian', confidence: 0.97, bbox: [400, 210, 35, 85] }
      ],
      incident: null
    },
    { 
      id: 104, type: 'uncertain', confidence: 0.51, time: '10:48', label: 'Частичное перекрытие', seed: 'tech2',
      objects: [
        { label: 'Robot', confidence: 0.51, bbox: [180, 250, 60, 50] }
      ],
      incident: null
    },
    { 
      id: 105, type: 'violation', confidence: 0.94, time: '10:45', label: 'Опасное сближение', seed: 'robot1',
      objects: [
        { label: 'Robot', confidence: 0.96, bbox: [220, 180, 70, 60] },
        { label: 'Pedestrian', confidence: 0.92, bbox: [250, 190, 30, 70] }
      ],
      incident: { type: 'Proximity', value: '0.3m', limit: '1.5m', severity: 'high' }
    },
    { 
      id: 106, type: 'normal', confidence: 0.97, time: '10:40', label: 'Пешеходная зона', seed: 'street2',
      objects: [
        { label: 'Courier (SIM)', confidence: 0.97, bbox: [100, 300, 50, 100] }
      ],
      incident: null
    },
    { 
      id: 107, type: 'uncertain', confidence: 0.38, time: '10:35', label: 'Блик на камере', seed: 'light1',
      objects: [],
      incident: null
    },
    { 
      id: 108, type: 'violation', confidence: 0.92, time: '10:30', label: 'Запрещенная зона', seed: 'park1',
      objects: [
        { label: 'Courier (Bike)', confidence: 0.92, bbox: [450, 50, 90, 130] }
      ],
      incident: { type: 'Zone Violation', value: 'Playground', severity: 'medium' }
    },
  ];

  const filteredSnapshots = useMemo(() => {
    if (galleryFilter === 'all') return SNAPSHOTS;
    return SNAPSHOTS.filter(s => s.type === galleryFilter);
  }, [galleryFilter]);

  const trajectoryCount = useMemo(() => {
    if (selectedInterval === '5 мин') return 2;
    if (selectedInterval === '15 мин') return 4;
    return 6;
  }, [selectedInterval]);

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isNight ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-64 border-r transition-colors ${isNight ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} z-50 hidden lg:block`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Eye className="text-white w-6 h-6" />
            </div>
            <h1 className="font-bold text-lg leading-tight">SmartPed<br/><span className="text-indigo-500">Analytics</span></h1>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'overview', label: 'Обзор', icon: Activity },
              { id: 'map', label: 'Карта потоков', icon: MapIcon },
              { id: 'safety', label: 'Безопасность', icon: AlertTriangle },
              { id: 'gallery', label: 'Архив кадров', icon: Camera },
              { id: 'monitoring', label: 'Мониторинг ИИ', icon: TrendingUp },
              { id: 'reports', label: 'Отчеты', icon: Clock },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === item.id 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <div className={`p-4 rounded-2xl border ${isNight ? 'bg-slate-800 border-slate-700' : 'bg-indigo-50 border-indigo-100'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider opacity-60">Режим съемки</span>
              {isNight ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
            </div>
            <button 
              onClick={() => setIsNight(!isNight)}
              className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${
                isNight ? 'bg-indigo-500 text-white' : 'bg-white text-slate-900 shadow-sm'
              }`}
            >
              Переключить на {isNight ? 'День' : 'Ночь'}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 p-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold">Ситуационный центр</h2>
            <p className="text-slate-500 text-sm">Пешеходная зона: ул. Никольская, Москва</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[1,2,3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                  <img src={`https://picsum.photos/seed/${i+10}/32/32`} alt="user" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
            <div className={`h-10 w-px ${isNight ? 'bg-slate-800' : 'bg-slate-200'}`} />
            <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 px-3 py-1.5 rounded-full text-xs font-bold">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Система активна
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <StatCard title="Всего объектов" value="1,284" icon={Users} trend={12} color="bg-indigo-500" />
          <StatCard title="Курьеры" value="342" icon={Navigation} trend={5} color="bg-amber-500" />
          <StatCard title="Роботы" value="56" icon={Package} trend={24} color="bg-purple-500" />
          <StatCard title="Инциденты" value="3" icon={AlertTriangle} trend={-15} color="bg-rose-500" />
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'monitoring' ? (
            <motion.div
              key="monitoring"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Training Metrics */}
                <div className={`p-6 rounded-2xl border ${isNight ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <h3 className="font-bold mb-6 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    Метрики обучения модели (YOLOv8-m)
                  </h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[
                        { epoch: 1, mAP: 0.45, loss: 2.1 },
                        { epoch: 10, mAP: 0.62, loss: 1.4 },
                        { epoch: 20, mAP: 0.75, loss: 0.9 },
                        { epoch: 30, mAP: 0.82, loss: 0.6 },
                        { epoch: 40, mAP: 0.86, loss: 0.45 },
                        { epoch: 50, mAP: 0.88, loss: 0.38 },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isNight ? '#1e293b' : '#f1f5f9'} />
                        <XAxis dataKey="epoch" label={{ value: 'Эпохи', position: 'insideBottom', offset: -5, fontSize: 10 }} axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                        <Line yAxisId="left" type="monotone" dataKey="mAP" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} name="mAP@50" />
                        <Line yAxisId="right" type="monotone" dataKey="loss" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" name="Loss" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
                      <p className="text-[10px] text-slate-500">Precision</p>
                      <p className="text-sm font-bold text-indigo-600">0.89</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
                      <p className="text-[10px] text-slate-500">Recall</p>
                      <p className="text-sm font-bold text-indigo-600">0.91</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
                      <p className="text-[10px] text-slate-500">F1-Score</p>
                      <p className="text-sm font-bold text-indigo-600">0.90</p>
                    </div>
                  </div>
                </div>

                {/* System Performance */}
                <div className={`p-6 rounded-2xl border ${isNight ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <h3 className="font-bold mb-6 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    Производительность системы (Edge)
                  </h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Детекция', latency: 32 },
                        { name: 'Трекинг', latency: 12 },
                        { name: 'Предикт', latency: 45 },
                        { name: 'Логика', latency: 8 },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isNight ? '#1e293b' : '#f1f5f9'} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} label={{ value: 'мс', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                        <Bar dataKey="latency" radius={[4, 4, 0, 0]}>
                          { [0,1,2,3].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 2 ? '#818cf8' : '#6366f1'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-emerald-700">Сквозная задержка (E2E)</p>
                      <p className="text-2xl font-black text-emerald-600">97 <span className="text-sm font-normal">мс</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-emerald-600 font-bold uppercase">Статус GPU</p>
                      <p className="text-xs font-medium text-emerald-700">Загрузка: 64%</p>
                    </div>
                  </div>
                </div>

                {/* Model Drift & Concept Drift */}
                <div className={`xl:col-span-2 p-6 rounded-2xl border ${isNight ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-500" />
                      Мониторинг деградации моделей (Concept Drift)
                    </h3>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                      Evidently AI Engine
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <span className="text-xs text-slate-500">Точность классификации</span>
                        <span className="text-xs font-bold">98.2%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full w-[98%]" />
                      </div>
                      <p className="text-[10px] text-slate-400">Стабильно за последние 7 дней</p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <span className="text-xs text-slate-500">Дрейф данных (Объекты)</span>
                        <span className="text-xs font-bold text-amber-500">14%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full w-[14%]" />
                      </div>
                      <p className="text-[10px] text-slate-400">Появление новых типов СИМ</p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <span className="text-xs text-slate-500">Уверенность предиктора</span>
                        <span className="text-xs font-bold">88.5%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full w-[88%]" />
                      </div>
                      <p className="text-[10px] text-slate-400">Social-LSTM Performance</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'map' ? (
            <motion.div
              key="map-view"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-[calc(100vh-120px)] flex flex-col gap-6"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold">Карта траекторий</h2>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    {['5 мин', '15 мин', '30 мин', '1 ч'].map((time) => (
                      <button 
                        key={time}
                        onClick={() => setSelectedInterval(time)}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${selectedInterval === time ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {OBJECT_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => {
                        setSelectedObjectTypes(prev => 
                          prev.includes(type.id) ? prev.filter(id => id !== type.id) : [...prev, type.id]
                        )
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                        selectedObjectTypes.includes(type.id) 
                          ? 'bg-white border-indigo-200 shadow-sm' 
                          : 'bg-transparent border-transparent opacity-50'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${type.color}`} />
                      <span className="text-xs font-bold">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 relative bg-slate-100 rounded-3xl overflow-hidden border border-slate-200 z-0">
                <MapContainer 
                  center={[55.7558, 37.6173]} 
                  zoom={16} 
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                >
                  <TileLayer
                    url={isNight 
                      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    }
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  
                  {/* Trajectories as Polylines */}
                  {selectedObjectTypes.includes('pedestrian') && [
                    [[55.756, 37.615], [55.757, 37.618], [55.758, 37.620]],
                    [[55.754, 37.616], [55.755, 37.619], [55.756, 37.622]],
                    [[55.758, 37.614], [55.756, 37.617], [55.754, 37.620]],
                  ].map((positions, i) => (
                    <Polyline 
                      key={`ped-${i}`} 
                      positions={positions as any} 
                      color="#6366f1" 
                      weight={2} 
                      opacity={0.6} 
                    />
                  ))}

                  {selectedObjectTypes.includes('courier') && [
                    [[55.753, 37.610], [55.755, 37.615], [55.758, 37.625]],
                    [[55.759, 37.612], [55.756, 37.618], [55.752, 37.622]],
                  ].map((positions, i) => (
                    <Polyline 
                      key={`courier-${i}`} 
                      positions={positions as any} 
                      color="#f59e0b" 
                      weight={3} 
                      dashArray="5, 10" 
                      opacity={0.8} 
                    />
                  ))}

                  {selectedObjectTypes.includes('robot') && [
                    [[55.757, 37.613], [55.757, 37.623]],
                    [[55.754, 37.614], [55.754, 37.624]],
                  ].map((positions, i) => (
                    <Polyline 
                      key={`robot-${i}`} 
                      positions={positions as any} 
                      color="#a855f7" 
                      weight={4} 
                      opacity={0.9} 
                    />
                  ))}

                  {/* Heatmap Simulation with Circles */}
                  <CircleMarker center={[55.756, 37.618]} radius={40} pathOptions={{ fillColor: '#f43f5e', fillOpacity: 0.2, stroke: false }} />
                  <CircleMarker center={[55.756, 37.618]} radius={20} pathOptions={{ fillColor: '#f43f5e', fillOpacity: 0.3, stroke: false }} />
                  <CircleMarker center={[55.754, 37.620]} radius={50} pathOptions={{ fillColor: '#6366f1', fillOpacity: 0.15, stroke: false }} />

                  {/* Conflicts */}
                  {[
                    { pos: [55.7565, 37.6185], label: 'TTC: 0.8s', type: 'Robot vs Courier' },
                    { pos: [55.7545, 37.6205], label: 'TTC: 1.2s', type: 'Pedestrian vs Bike' },
                  ].map((conflict, idx) => (
                    <CircleMarker 
                      key={idx} 
                      center={conflict.pos as any} 
                      radius={8} 
                      pathOptions={{ fillColor: '#f43f5e', color: '#fff', weight: 2, fillOpacity: 1 }}
                    >
                      <Popup>
                        <div className="p-1">
                          <p className="text-xs font-bold text-rose-600">{conflict.type}</p>
                          <p className="text-[10px] text-slate-500">{conflict.label}</p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>

                {/* Map Controls Overlay */}
                <div className="absolute top-6 right-6 flex flex-col gap-3">
                  <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl min-w-[180px]">
                    <h4 className="text-xs font-bold mb-3">Слои визуализации</h4>
                    <div className="space-y-2">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-[10px] text-slate-600">Тепловая карта</span>
                        <div className="w-7 h-4 bg-indigo-600 rounded-full relative">
                          <div className="absolute right-1 top-1 w-2 h-2 bg-white rounded-full" />
                        </div>
                      </label>
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-[10px] text-slate-600">Конфликты</span>
                        <div className="w-7 h-4 bg-indigo-600 rounded-full relative">
                          <div className="absolute right-1 top-1 w-2 h-2 bg-white rounded-full" />
                        </div>
                      </label>
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-[10px] text-slate-600">Зоны интереса</span>
                        <div className="w-7 h-4 bg-slate-200 rounded-full relative">
                          <div className="absolute left-1 top-1 w-2 h-2 bg-white rounded-full" />
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <MapIcon className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold">Анализ потоков</h4>
                      <p className="text-[10px] text-slate-500">Режим реального времени</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[8px] text-slate-400 uppercase font-bold">Объектов</p>
                      <p className="text-sm font-bold">1,240</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-400 uppercase font-bold">Конфликтов</p>
                      <p className="text-sm font-bold text-rose-500">12</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'gallery' ? (
            <motion.div
              key="gallery"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                  {[
                    { id: 'all', label: 'Все' },
                    { id: 'violation', label: 'Нарушения' },
                    { id: 'uncertain', label: 'Неопределенные' },
                    { id: 'normal', label: 'Без нарушений' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setGalleryFilter(f.id)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        galleryFilter === f.id ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Найдено кадров: {filteredSnapshots.length}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredSnapshots.map((s) => (
                  <motion.div
                    layout
                    key={s.id}
                    onClick={() => setSelectedSnapshot(s)}
                    className={`group relative rounded-2xl border overflow-hidden transition-all hover:shadow-xl cursor-pointer ${
                      isNight ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="aspect-video relative overflow-hidden bg-slate-200">
                      <img 
                        src={`https://picsum.photos/seed/${s.seed}/400/225`} 
                        alt={s.label}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="absolute top-2 right-2">
                        <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase backdrop-blur-md border ${
                          s.type === 'violation' ? 'bg-rose-500/80 border-rose-400 text-white' :
                          s.type === 'uncertain' ? 'bg-amber-500/80 border-amber-400 text-white' :
                          'bg-emerald-500/80 border-emerald-400 text-white'
                        }`}>
                          {s.type === 'violation' ? 'Нарушение' : s.type === 'uncertain' ? 'Низкая уверенность' : 'Норма'}
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-bold truncate pr-2">{s.label}</h4>
                        <span className="text-[10px] font-mono text-slate-400">{s.time}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${s.confidence * 100}%` }}
                            className={`h-full ${s.confidence < 0.6 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">
                          {Math.floor(s.confidence * 100)}%
                        </span>
                      </div>
                      <button className="w-full mt-4 py-2 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                        Подробнее
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Snapshot Detail Modal */}
              <AnimatePresence>
                {selectedSnapshot && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setSelectedSnapshot(null)}
                      className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 20 }}
                      className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl flex flex-col md:flex-row ${
                        isNight ? 'bg-slate-900 border border-slate-800' : 'bg-white'
                      }`}
                    >
                      {/* Left: Image with Bounding Boxes */}
                      <div className="md:w-3/5 relative bg-slate-100 flex items-center justify-center overflow-hidden">
                        <img 
                          src={`https://picsum.photos/seed/${selectedSnapshot.seed}/800/450`} 
                          alt="Detail" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {/* Simulated Bounding Boxes */}
                        {selectedSnapshot.objects.map((obj: any, idx: number) => (
                          <div 
                            key={idx}
                            className="absolute border-2 border-indigo-500 bg-indigo-500/10 rounded"
                            style={{
                              left: `${obj.bbox[0] / 8}%`,
                              top: `${obj.bbox[1] / 4.5}%`,
                              width: `${obj.bbox[2] / 8}%`,
                              height: `${obj.bbox[3] / 4.5}%`,
                            }}
                          >
                            <span className="absolute -top-5 left-0 bg-indigo-500 text-white text-[8px] font-bold px-1 py-0.5 rounded whitespace-nowrap">
                              {obj.label} {Math.floor(obj.confidence * 100)}%
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Right: Info Panel */}
                      <div className="md:w-2/5 p-6 flex flex-col overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h3 className="text-lg font-bold">{selectedSnapshot.label}</h3>
                            <p className="text-xs text-slate-500 font-mono">{selectedSnapshot.time} | ID: {selectedSnapshot.id}</p>
                          </div>
                          <button 
                            onClick={() => setSelectedSnapshot(null)}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                          >
                            <Info className="w-5 h-5 rotate-45" />
                          </button>
                        </div>

                        <div className="space-y-6">
                          {/* Incident Data */}
                          {selectedSnapshot.incident && (
                            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                              <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-3 h-3" />
                                Данные инцидента
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-[10px] text-rose-400 font-medium">Тип</p>
                                  <p className="text-sm font-bold text-rose-900">{selectedSnapshot.incident.type}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-rose-400 font-medium">Значение</p>
                                  <p className="text-sm font-bold text-rose-900">{selectedSnapshot.incident.value}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Object Confidence Scores */}
                          <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Детекция объектов</h4>
                            <div className="space-y-3">
                              {selectedSnapshot.objects.length > 0 ? selectedSnapshot.objects.map((obj: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                    <span className="text-sm font-medium">{obj.label}</span>
                                  </div>
                                  <span className={`text-sm font-bold ${obj.confidence > 0.8 ? 'text-indigo-600' : 'text-amber-500'}`}>
                                    {Math.floor(obj.confidence * 100)}%
                                  </span>
                                </div>
                              )) : (
                                <p className="text-xs text-slate-400 italic">Объекты не обнаружены</p>
                              )}
                            </div>
                          </div>

                          {/* AI Analysis */}
                          <div className="pt-4 border-t border-slate-100">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Анализ ИИ</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              {selectedSnapshot.type === 'uncertain' 
                                ? 'Модель обнаружила объект с низким уровнем уверенности. Рекомендуется ручная классификация для улучшения обучающей выборки.'
                                : 'Объект успешно идентифицирован и отслежен. Параметры движения соответствуют установленным нормам безопасности.'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-auto pt-6 flex gap-2">
                          <button className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                            Подтвердить
                          </button>
                          <button className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-all">
                            В архив
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Main Chart */}
                <div className={`xl:col-span-2 p-6 rounded-2xl border ${isNight ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-500" />
                      Динамика трафика (24ч)
                    </h3>
                    <div className="flex gap-2">
                      <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                        <div className="w-2 h-2 rounded-full bg-indigo-500" /> Пешеходы
                      </span>
                      <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                        <div className="w-2 h-2 rounded-full bg-amber-500" /> Курьеры
                      </span>
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={hourlyData}>
                        <defs>
                          <linearGradient id="colorPed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isNight ? '#1e293b' : '#f1f5f9'} />
                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area type="monotone" dataKey="pedestrians" stroke="#6366f1" fillOpacity={1} fill="url(#colorPed)" strokeWidth={3} />
                        <Area type="monotone" dataKey="couriers" stroke="#f59e0b" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Day vs Night Comparison */}
                <div className={`p-6 rounded-2xl border ${isNight ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <h3 className="font-bold mb-6 flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    Сравнение День / Ночь
                  </h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dayNightComparisonData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isNight ? '#1e293b' : '#f1f5f9'} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="metric" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10}} width={80} />
                        <Tooltip 
                          cursor={{fill: 'transparent'}}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="day" name="День" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={12} />
                        <Bar dataKey="night" name="Ночь" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 flex justify-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <span className="text-[10px] text-slate-500 font-bold uppercase">День</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-indigo-500" />
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Ночь</span>
                    </div>
                  </div>
                </div>

          {/* Live Feed / Incidents */}
          <div className={`p-6 rounded-2xl border ${isNight ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className="font-bold mb-6 flex items-center gap-2">
              <Camera className="w-4 h-4 text-rose-500" />
              Последние инциденты
            </h3>
            <div className="space-y-4">
              {INCIDENTS.map(inc => (
                <div key={inc.id} className={`p-4 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer ${
                  isNight ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      inc.severity === 'high' ? 'bg-rose-500 text-white' : 
                      inc.severity === 'medium' ? 'bg-amber-500 text-white' : 'bg-indigo-500 text-white'
                    }`}>
                      {inc.type}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{inc.time}</span>
                  </div>
                  <h4 className="font-bold text-sm">{inc.object}</h4>
                  <p className="text-xs text-slate-500 mt-1">{inc.desc}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <button className="text-indigo-500 text-[10px] font-bold flex items-center gap-1">
                      Смотреть клип <ChevronRight className="w-3 h-3" />
                    </button>
                    <div className="flex gap-1">
                      <div className="w-4 h-4 rounded bg-slate-200" />
                      <div className="w-4 h-4 rounded bg-slate-200" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-bold hover:border-indigo-300 hover:text-indigo-400 transition-all">
              Архив событий
            </button>
          </div>

          {/* Heatmap & Trajectories Simulation */}
          <div className={`xl:col-span-3 p-6 rounded-2xl border ${isNight ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <h3 className="font-bold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  Анализ траекторий и тепловая карта
                </h3>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  {['5 мин', '15 мин', '30 мин'].map((time) => (
                    <button 
                      key={time}
                      onClick={() => setSelectedInterval(time)}
                      className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${selectedInterval === time ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" /> <span className="text-xs text-slate-500">Конфликт</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-400" /> <span className="text-xs text-slate-500">Траектория</span>
                </div>
                <div className="h-4 w-px bg-slate-200 mx-2" />
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${activeTab === 'map' ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${activeTab === 'map' ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                  <span className="text-xs font-bold">Слой ИИ</span>
                </label>
              </div>
            </div>
            
            <div className="relative h-[500px] bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
              {/* Simulated Map Background */}
              <div className={`absolute inset-0 opacity-20 ${isNight ? 'invert' : ''}`} style={{ 
                backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', 
                backgroundSize: '20px 20px' 
              }} />
              
              {/* Heatmap Layer */}
              <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-rose-500/20 blur-[80px] rounded-full" />
              <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/15 blur-[100px] rounded-full" />

              {/* Trajectories Layer (SVG) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <g opacity={0.6}>
                  {Array.from({ length: trajectoryCount }).map((_, idx) => (
                    <motion.path
                      key={idx}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 2 + idx * 0.5, repeat: Infinity, repeatDelay: 2 }}
                      d={`M ${50 + idx * 100} ${100 + (idx % 2) * 200} Q ${250 + idx * 50} ${150 + idx * 30} ${400 + idx * 80} ${100 + (idx % 3) * 100} T ${700} ${150 + idx * 40}`}
                      fill="none"
                      stroke={idx % 2 === 0 ? "#818cf8" : "#a855f7"}
                      strokeWidth="1.5"
                      strokeDasharray={idx % 3 === 0 ? "4 4" : "none"}
                    />
                  ))}
                  
                  {/* Conflict Path Highlight */}
                  <motion.path
                    d="M 400 50 L 420 250 L 450 450"
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2"
                    strokeOpacity={0.6}
                    strokeDasharray="5 5"
                  />
                </g>
              </svg>

              {/* Conflict Points */}
              <div className="absolute top-[240px] left-[415px]">
                <motion.div 
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-10 h-10 bg-rose-500/20 rounded-full flex items-center justify-center -translate-x-1/2 -translate-y-1/2 border border-rose-500/30"
                >
                  <div className="w-4 h-4 bg-rose-500 rounded-full shadow-lg shadow-rose-500/50 flex items-center justify-center">
                    <AlertTriangle className="w-2.5 h-2.5 text-white" />
                  </div>
                </motion.div>
                <div className="absolute top-4 left-4 bg-white/95 p-2 rounded-lg border border-rose-100 shadow-xl min-w-[140px] backdrop-blur-sm">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3 h-3 text-rose-500" />
                    <span className="text-[9px] font-bold text-rose-600 uppercase">Конфликтная точка</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-900">Опасное сближение</p>
                  <p className="text-[8px] text-slate-500 mt-0.5">Робот vs Курьер (СИМ)</p>
                  <div className="mt-1.5 flex gap-1">
                    <span className="text-[8px] bg-slate-100 px-1 py-0.5 rounded text-slate-600">TTC: 0.8с</span>
                    <span className="text-[8px] bg-slate-100 px-1 py-0.5 rounded text-slate-600">Dist: 0.4м</span>
                  </div>
                </div>
              </div>

              {/* Moving Objects Simulation */}
              <AnimatePresence>
                {Array.from({ length: 15 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: Math.random() * 800, y: Math.random() * 400 }}
                    animate={{ 
                      x: [Math.random() * 800, Math.random() * 800],
                      y: [Math.random() * 400, Math.random() * 400]
                    }}
                    transition={{ duration: 15 + Math.random() * 20, repeat: Infinity, ease: "linear" }}
                    className={`absolute w-2 h-2 rounded-full shadow-lg ${
                      i % 4 === 0 ? 'bg-amber-500 shadow-amber-500/50' : 
                      i % 5 === 0 ? 'bg-purple-500 shadow-purple-500/50' : 'bg-indigo-500 shadow-indigo-500/50'
                    }`}
                  />
                ))}
              </AnimatePresence>

              {/* Legend & Controls Overlay */}
              <div className="absolute bottom-6 right-6 flex flex-col gap-2">
                <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-2xl min-w-[200px]">
                  <h4 className="text-xs font-bold mb-3 flex items-center gap-2">
                    <Activity className="w-3 h-3 text-indigo-500" />
                    Статистика за интервал
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500">Активных треков</span>
                      <span className="text-[10px] font-bold">124</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500">Конфликтов</span>
                      <span className="text-[10px] font-bold text-rose-500">8</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                      <div className="bg-indigo-500 h-full w-[65%]" />
                    </div>
                    <p className="text-[8px] text-slate-400 mt-1">Плотность: выше нормы на 12%</p>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Info className="w-3 h-3 text-indigo-500" />
                  <span className="text-[10px] font-bold text-slate-900">Интеллектуальный слой</span>
                </div>
                <p className="text-[9px] text-slate-500 leading-tight">
                  Отображены траектории за последние 15 минут.<br/>
                  Выделены точки пересечения с высоким риском TTC.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
</main>
</div>
);
}
