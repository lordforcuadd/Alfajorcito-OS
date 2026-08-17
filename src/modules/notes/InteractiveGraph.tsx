import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RefreshCw,
  Search,
  Filter,
  Play,
  Pause,
  Layers,
  ArrowRight,
  ExternalLink,
  BookOpen,
  GraduationCap,
  Sparkles,
  FileText,
  HelpCircle,
  Tag,
  CheckCircle2,
  Network,
  X
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { FormattedNoteContent } from './WikiLinkRenderer';
import type { Note, Concept, Course, Work } from '../../types';

export interface InteractiveGraphProps {
  notes: Note[];
  courses: Course[];
  works: Work[];
  concepts: Concept[];
  onOpenNote: (note: Note) => void;
  onOpenWork?: (workId: string) => void;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'course' | 'work' | 'concept' | 'note';
  color: string;
  glowColor: string;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isDragging?: boolean;
  phase: number;
  rawItem: Note | Concept | Course | Work;
  connectionsCount: number;
}

export interface GraphEdge {
  source: GraphNode;
  target: GraphNode;
  length: number;
  particles: number[]; // particle progress [0..1]
}

// ─── HIGH CONTRAST & DISTINCT GRAPH COLOR PALETTE ───
export const GRAPH_PALETTE = {
  course: {
    base: '#7C3AED',       // Vivid Royal Violet / Indigo (Major Course Hub)
    glow: 'rgba(124, 58, 237, 0.45)',
    label: 'Cursos',
    radius: 20
  },
  work: {
    base: '#E11D48',         // Vivid Ruby Crimson (Thesis / Projects)
    glow: 'rgba(225, 29, 72, 0.45)',
    label: 'Tesis',
    radius: 15
  },
  concept: {
    base: '#0D9488',      // Vivid Emerald Teal (Theoretical Concepts)
    glow: 'rgba(13, 148, 136, 0.45)',
    label: 'Conceptos',
    radius: 11
  },
  note: {
    base: '#D97706',         // Vivid Warm Golden Amber (Study Notes & Ideas)
    glow: 'rgba(217, 119, 6, 0.45)',
    label: 'Notas',
    radius: 8.5
  }
};

export const InteractiveGraph: React.FC<InteractiveGraphProps> = ({
  notes,
  courses,
  works,
  concepts,
  onOpenNote,
  onOpenWork
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Viewport transformation state (Pan & Zoom)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Mobile search drawer state
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // Touch tracking for mobile
  const touchStartRef = useRef<{ x: number; y: number; dist?: number }>({ x: 0, y: 0 });

  // Interaction State
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPhysicsRunning, setIsPhysicsRunning] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Type Filters
  const [filterTypes, setFilterTypes] = useState<Record<string, boolean>>({
    course: true,
    work: true,
    concept: true,
    note: true
  });

  // Nodes & Edges mutable physics storage
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const dimensionsRef = useRef({ width: 800, height: 500, dpr: 1 });

  // Build or update Graph structure (Preserving existing node positions to prevent jitter!)
  const buildGraphData = useCallback(() => {
    const existingNodesMap = new Map<string, GraphNode>();
    nodesRef.current.forEach((n) => existingNodesMap.set(n.id, n));

    const newNodes: GraphNode[] = [];
    const nodeMap = new Map<string, GraphNode>();
    const width = containerRef.current?.clientWidth || 800;
    const height = isFullscreen ? window.innerHeight - 80 : window.innerWidth < 640 ? 460 : 580;

    const centerX = width / 2;
    const centerY = height / 2;

    // 1. Courses (Major Hubs)
    if (filterTypes.course) {
      courses.forEach((c, idx) => {
        const existing = existingNodesMap.get(c.id);
        const angle = (idx / Math.max(1, courses.length)) * Math.PI * 2;
        const dist = Math.min(width, height) * 0.32;
        const node: GraphNode = {
          id: c.id,
          label: c.name,
          type: 'course',
          color: GRAPH_PALETTE.course.base,
          glowColor: GRAPH_PALETTE.course.glow,
          radius: GRAPH_PALETTE.course.radius,
          x: existing ? existing.x : centerX + Math.cos(angle) * dist + (Math.random() - 0.5) * 20,
          y: existing ? existing.y : centerY + Math.sin(angle) * dist + (Math.random() - 0.5) * 20,
          vx: existing ? existing.vx : 0,
          vy: existing ? existing.vy : 0,
          phase: existing ? existing.phase : Math.random() * Math.PI * 2,
          rawItem: c,
          connectionsCount: 0
        };
        newNodes.push(node);
        nodeMap.set(c.id, node);
      });
    }

    // 2. Works & Thesis (Sub-Hubs)
    if (filterTypes.work) {
      works.forEach((w) => {
        const existing = existingNodesMap.get(w.id);
        const parentCourse = nodeMap.get(w.courseId);
        const baseX = parentCourse ? parentCourse.x + (Math.random() - 0.5) * 80 : centerX;
        const baseY = parentCourse ? parentCourse.y + (Math.random() - 0.5) * 80 : centerY;
        const node: GraphNode = {
          id: w.id,
          label: w.title,
          type: 'work',
          color: GRAPH_PALETTE.work.base,
          glowColor: GRAPH_PALETTE.work.glow,
          radius: GRAPH_PALETTE.work.radius,
          x: existing ? existing.x : baseX,
          y: existing ? existing.y : baseY,
          vx: existing ? existing.vx : 0,
          vy: existing ? existing.vy : 0,
          phase: existing ? existing.phase : Math.random() * Math.PI * 2,
          rawItem: w,
          connectionsCount: 0
        };
        newNodes.push(node);
        nodeMap.set(w.id, node);
      });
    }

    // 3. Concepts (Theoretical Concepts)
    if (filterTypes.concept) {
      concepts.forEach((conc) => {
        const existing = existingNodesMap.get(conc.id);
        const node: GraphNode = {
          id: conc.id,
          label: conc.name,
          type: 'concept',
          color: GRAPH_PALETTE.concept.base,
          glowColor: GRAPH_PALETTE.concept.glow,
          radius: GRAPH_PALETTE.concept.radius,
          x: existing ? existing.x : centerX + (Math.random() - 0.5) * (width * 0.55),
          y: existing ? existing.y : centerY + (Math.random() - 0.5) * (height * 0.55),
          vx: existing ? existing.vx : 0,
          vy: existing ? existing.vy : 0,
          phase: existing ? existing.phase : Math.random() * Math.PI * 2,
          rawItem: conc,
          connectionsCount: 0
        };
        newNodes.push(node);
        nodeMap.set(conc.id, node);
      });
    }

    // 4. Notes (Satellites)
    if (filterTypes.note) {
      notes.forEach((n) => {
        const existing = existingNodesMap.get(n.id);
        let parentX = centerX;
        let parentY = centerY;
        if (n.workId && nodeMap.has(n.workId)) {
          parentX = nodeMap.get(n.workId)!.x;
          parentY = nodeMap.get(n.workId)!.y;
        } else if (n.courseId && nodeMap.has(n.courseId)) {
          parentX = nodeMap.get(n.courseId)!.x;
          parentY = nodeMap.get(n.courseId)!.y;
        }

        const node: GraphNode = {
          id: n.id,
          label: n.title,
          type: 'note',
          color: GRAPH_PALETTE.note.base,
          glowColor: GRAPH_PALETTE.note.glow,
          radius: GRAPH_PALETTE.note.radius,
          x: existing ? existing.x : parentX + (Math.random() - 0.5) * 60,
          y: existing ? existing.y : parentY + (Math.random() - 0.5) * 60,
          vx: existing ? existing.vx : 0,
          vy: existing ? existing.vy : 0,
          phase: existing ? existing.phase : Math.random() * Math.PI * 2,
          rawItem: n,
          connectionsCount: 0
        };
        newNodes.push(node);
        nodeMap.set(n.id, node);
      });
    }

    // 5. Connect Edges
    const newEdges: GraphEdge[] = [];

    // Works -> Courses
    works.forEach((w) => {
      const wNode = nodeMap.get(w.id);
      const cNode = nodeMap.get(w.courseId);
      if (wNode && cNode) {
        newEdges.push({
          source: wNode,
          target: cNode,
          length: 110,
          particles: [Math.random(), (Math.random() + 0.5) % 1]
        });
        wNode.connectionsCount++;
        cNode.connectionsCount++;
      }
    });

    // Notes -> Works, Courses, Concepts
    notes.forEach((n) => {
      const nNode = nodeMap.get(n.id);
      if (!nNode) return;

      if (n.workId && nodeMap.has(n.workId)) {
        const wNode = nodeMap.get(n.workId)!;
        newEdges.push({
          source: nNode,
          target: wNode,
          length: 75,
          particles: [Math.random()]
        });
        nNode.connectionsCount++;
        wNode.connectionsCount++;
      }
      if (n.courseId && nodeMap.has(n.courseId)) {
        const cNode = nodeMap.get(n.courseId)!;
        newEdges.push({
          source: nNode,
          target: cNode,
          length: 90,
          particles: [Math.random()]
        });
        nNode.connectionsCount++;
        cNode.connectionsCount++;
      }
      (n.conceptIds || []).forEach((cid) => {
        if (nodeMap.has(cid)) {
          const concNode = nodeMap.get(cid)!;
          newEdges.push({
            source: nNode,
            target: concNode,
            length: 80,
            particles: [Math.random()]
          });
          nNode.connectionsCount++;
          concNode.connectionsCount++;
        }
      });

      // 6. Dynamic [[wiki-links]] parsing from note text content
      if (n.content) {
        const matches = n.content.matchAll(/\[\[(.*?)\]\]/g);
        for (const match of matches) {
          const targetName = match[1]?.trim().toLowerCase();
          if (!targetName) continue;

          // Search matching node by title or label
          const matchedTarget = newNodes.find(
            (node) =>
              node.id !== n.id &&
              (node.label.toLowerCase() === targetName ||
                node.label.toLowerCase().includes(targetName) ||
                targetName.includes(node.label.toLowerCase()))
          );

          if (matchedTarget) {
            const alreadyExists = newEdges.some(
              (e) =>
                (e.source.id === nNode.id && e.target.id === matchedTarget.id) ||
                (e.source.id === matchedTarget.id && e.target.id === nNode.id)
            );
            if (!alreadyExists) {
              newEdges.push({
                source: nNode,
                target: matchedTarget,
                length: 70,
                particles: [Math.random()]
              });
              nNode.connectionsCount++;
              matchedTarget.connectionsCount++;
            }
          }
        }
      }
    });

    nodesRef.current = newNodes;
    edgesRef.current = newEdges;
  }, [courses, works, concepts, notes, filterTypes, isFullscreen]);

  // Rebuild on data or filter change
  useEffect(() => {
    buildGraphData();
  }, [buildGraphData]);

  // Find connected neighbors of a node
  const getConnectedNodeIds = useCallback((node: GraphNode): Set<string> => {
    const connected = new Set<string>();
    connected.add(node.id);
    edgesRef.current.forEach((edge) => {
      if (edge.source.id === node.id) connected.add(edge.target.id);
      if (edge.target.id === node.id) connected.add(edge.source.id);
    });
    return connected;
  }, []);

  const activeConnectedIds = useMemo(() => {
    const active = selectedNode || hoveredNode;
    return active ? getConnectedNodeIds(active) : null;
  }, [selectedNode, hoveredNode, getConnectedNodeIds]);

  // Canvas DPI Setup & Resize Observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const width = parent.clientWidth || 800;
      const height = isFullscreen ? window.innerHeight - 80 : window.innerWidth < 640 ? 460 : 580;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (
        dimensionsRef.current.width !== width ||
        dimensionsRef.current.height !== height ||
        dimensionsRef.current.dpr !== dpr
      ) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        dimensionsRef.current = { width, height, dpr };
      }
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    return () => ro.disconnect();
  }, [isFullscreen]);

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let lastTime = performance.now();

    const render = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      const { width, height, dpr } = dimensionsRef.current;
      const centerX = width / 2;
      const centerY = height / 2;

      // ─── 1. PHYSICS SIMULATION STEP ───
      if (isPhysicsRunning) {
        const nodes = nodesRef.current;
        const edges = edgesRef.current;

        // A. Repulsion (Coulomb with minimum distance clamp)
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const safeDist = Math.max(dist, 12);

            if (safeDist < 250) {
              const force = (250 - safeDist) / 250;
              const repStrength = (a.radius + b.radius) * 2.2 * force;
              const fx = (dx / safeDist) * repStrength;
              const fy = (dy / safeDist) * repStrength;

              if (!a.isDragging) {
                a.vx -= fx * 0.12;
                a.vy -= fy * 0.12;
              }
              if (!b.isDragging) {
                b.vx += fx * 0.12;
                b.vy += fy * 0.12;
              }
            }
          }
        }

        // B. Spring Tension (Hooke's Law)
        edges.forEach((edge) => {
          const a = edge.source;
          const b = edge.target;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const springForce = (dist - edge.length) * 0.02;

          const fx = (dx / dist) * springForce;
          const fy = (dy / dist) * springForce;

          if (!a.isDragging) {
            a.vx += fx;
            a.vy += fy;
          }
          if (!b.isDragging) {
            b.vx -= fx;
            b.vy -= fy;
          }
        });

        // C. Center Gravity, Harmonic Breathing & Velocity Clamping
        nodes.forEach((node) => {
          if (!node.isDragging) {
            const dx = centerX - node.x;
            const dy = centerY - node.y;
            node.vx += dx * 0.001;
            node.vy += dy * 0.001;

            // Organic subtle floating micro-wave
            node.phase += dt * 1.5;
            node.vx += Math.cos(node.phase) * 0.04;
            node.vy += Math.sin(node.phase) * 0.04;

            // Damping / Friction
            node.vx *= 0.86;
            node.vy *= 0.86;

            // Clamp max velocity to prevent sudden jumps
            const maxV = 7;
            node.vx = Math.max(-maxV, Math.min(maxV, node.vx));
            node.vy = Math.max(-maxV, Math.min(maxV, node.vy));

            node.x += node.vx;
            node.y += node.vy;

            // Soft boundaries
            const margin = node.radius + 15;
            if (node.x < margin) { node.x = margin; node.vx *= -0.5; }
            if (node.x > width - margin) { node.x = width - margin; node.vx *= -0.5; }
            if (node.y < margin) { node.y = margin; node.vy *= -0.5; }
            if (node.y > height - margin) { node.y = height - margin; node.vy *= -0.5; }
          }
        });

        // D. Animate Energy Particle Flow along Edges
        edges.forEach((edge) => {
          for (let p = 0; p < edge.particles.length; p++) {
            edge.particles[p] = (edge.particles[p] + dt * 0.45) % 1;
          }
        });
      }

      // ─── 2. RENDERING CANVAS WITH DPR SCALING ───
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Camera Transformation (Pan & Zoom)
      ctx.save();
      ctx.translate(pan.x + centerX, pan.y + centerY);
      ctx.scale(zoom, zoom);
      ctx.translate(-centerX, -centerY);

      // A. Ambient Grid Dots
      ctx.fillStyle = '#CBD5E1';
      const dotSpacing = 36;
      for (let gx = -width * 1.5; gx < width * 2.5; gx += dotSpacing) {
        for (let gy = -height * 1.5; gy < height * 2.5; gy += dotSpacing) {
          ctx.beginPath();
          ctx.arc(gx, gy, 0.85, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // B. Draw Edges & Particle Pulses
      edgesRef.current.forEach((edge) => {
        const isEdgeActive =
          activeConnectedIds &&
          activeConnectedIds.has(edge.source.id) &&
          activeConnectedIds.has(edge.target.id);

        ctx.beginPath();
        ctx.moveTo(edge.source.x, edge.source.y);
        ctx.lineTo(edge.target.x, edge.target.y);

        if (isEdgeActive) {
          ctx.strokeStyle = edge.source.color;
          ctx.lineWidth = 2.8;
          ctx.globalAlpha = 1.0;
        } else if (activeConnectedIds) {
          ctx.strokeStyle = '#E2E8F0';
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.12;
        } else {
          ctx.strokeStyle = '#94A3B8';
          ctx.lineWidth = 1.4;
          ctx.globalAlpha = 0.55;
        }

        ctx.stroke();

        // Draw Flowing Energy Particle Pulse
        if (!activeConnectedIds || isEdgeActive) {
          edge.particles.forEach((prog) => {
            const px = edge.source.x + (edge.target.x - edge.source.x) * prog;
            const py = edge.source.y + (edge.target.y - edge.source.y) * prog;

            ctx.beginPath();
            ctx.arc(px, py, isEdgeActive ? 2.8 : 1.8, 0, Math.PI * 2);
            ctx.fillStyle = isEdgeActive ? '#FFFFFF' : edge.source.color;
            ctx.globalAlpha = isEdgeActive ? 0.95 : 0.6;
            ctx.fill();
          });
        }

        ctx.globalAlpha = 1;
      });

      // C. Draw Nodes
      nodesRef.current.forEach((node) => {
        const isHovered = hoveredNode?.id === node.id;
        const isSelected = selectedNode?.id === node.id;
        const isDimmed = activeConnectedIds && !activeConnectedIds.has(node.id);
        const isMatchedBySearch =
          searchQuery.trim().length > 0 &&
          node.label.toLowerCase().includes(searchQuery.toLowerCase());

        ctx.save();
        if (isDimmed) {
          ctx.globalAlpha = 0.16;
        }

        // Vibrant Soft Glow Halo
        if (isHovered || isSelected || isMatchedBySearch) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 10, 0, Math.PI * 2);
          ctx.fillStyle = node.glowColor;
          ctx.globalAlpha = isDimmed ? 0.06 : 0.5;
          ctx.fill();
          ctx.globalAlpha = isDimmed ? 0.16 : 1;
        }

        // Drop Shadow
        if (!isDimmed) {
          ctx.shadowColor = 'rgba(15, 23, 42, 0.22)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetY = 2;
        }

        // Main Node Circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // Border ring
        ctx.lineWidth = isSelected ? 3.5 : isHovered ? 2.5 : 2;
        ctx.strokeStyle = isSelected ? '#0F172A' : '#FFFFFF';
        ctx.stroke();

        // Inner decorative ring for Major Course Hubs
        if (node.type === 'course') {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius * 0.42, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
        }

        // Node Label with High Contrast Pill
        const showLabel =
          zoom >= 0.65 ||
          node.type === 'course' ||
          node.type === 'work' ||
          isHovered ||
          isSelected ||
          isMatchedBySearch;

        if (showLabel) {
          ctx.font = `${isHovered || isSelected ? 'bold 11px' : '600 10px'} "Plus Jakarta Sans", sans-serif`;
          ctx.textAlign = 'center';

          const labelText =
            node.label.length > 22 && !isHovered && !isSelected
              ? node.label.substring(0, 20) + '...'
              : node.label;

          // High Contrast White Pill behind text
          const textWidth = ctx.measureText(labelText).width;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.beginPath();
          ctx.roundRect(
            node.x - textWidth / 2 - 5,
            node.y + node.radius + 3,
            textWidth + 10,
            15,
            5
          );
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = isSelected ? node.color : 'rgba(203, 213, 225, 0.85)';
          ctx.stroke();

          ctx.fillStyle = isDimmed ? '#94A3B8' : '#0F172A';
          ctx.fillText(labelText, node.x, node.y + node.radius + 14);
        }

        ctx.restore();
      });

      ctx.restore();
      ctx.restore();

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [
    isPhysicsRunning,
    zoom,
    pan,
    hoveredNode,
    selectedNode,
    activeConnectedIds,
    searchQuery,
    isFullscreen
  ]);

  // Convert Screen Mouse/Touch Coordinates to Graph World Coordinates
  const getGraphCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    const { width, height } = dimensionsRef.current;
    const centerX = width / 2;
    const centerY = height / 2;

    const worldX = (screenX - pan.x - centerX) / zoom + centerX;
    const worldY = (screenY - pan.y - centerY) / zoom + centerY;

    return { x: worldX, y: worldY };
  };

  // Find node under mouse
  const getNodeAt = (worldX: number, worldY: number): GraphNode | null => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const dx = worldX - node.x;
      const dy = worldY - node.y;
      if (dx * dx + dy * dy <= (node.radius + 6) * (node.radius + 6)) {
        return node;
      }
    }
    return null;
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGraphCoords(e.clientX, e.clientY);
    const clickedNode = getNodeAt(x, y);

    if (clickedNode) {
      clickedNode.isDragging = true;
      setDraggedNode(clickedNode);
      setSelectedNode(clickedNode);
    } else {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGraphCoords(e.clientX, e.clientY);

    if (draggedNode) {
      draggedNode.x = x;
      draggedNode.y = y;
      draggedNode.vx = 0;
      draggedNode.vy = 0;
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    } else {
      const node = getNodeAt(x, y);
      setHoveredNode(node);
    }
  };

  const handleMouseUp = () => {
    if (draggedNode) {
      draggedNode.isDragging = false;
      setDraggedNode(null);
    }
    setIsPanning(false);
  };

  // Touch Handlers for Mobile & Tablet
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const { x, y } = getGraphCoords(touch.clientX, touch.clientY);
      const clickedNode = getNodeAt(x, y);

      if (clickedNode) {
        clickedNode.isDragging = true;
        setDraggedNode(clickedNode);
        setSelectedNode(clickedNode);
      } else {
        setIsPanning(true);
        touchStartRef.current = { x: touch.clientX - pan.x, y: touch.clientY - pan.y };
      }
    } else if (e.touches.length === 2) {
      // Pinch to zoom start
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartRef.current.dist = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const { x, y } = getGraphCoords(touch.clientX, touch.clientY);

      if (draggedNode) {
        draggedNode.x = x;
        draggedNode.y = y;
        draggedNode.vx = 0;
        draggedNode.vy = 0;
      } else if (isPanning) {
        setPan({
          x: touch.clientX - touchStartRef.current.x,
          y: touch.clientY - touchStartRef.current.y
        });
      }
    } else if (e.touches.length === 2 && touchStartRef.current.dist) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.sqrt(dx * dx + dy * dy);
      const factor = currentDist / touchStartRef.current.dist;
      setZoom((prev) => Math.min(3.2, Math.max(0.35, prev * factor)));
      touchStartRef.current.dist = currentDist;
    }
  };

  const handleTouchEnd = () => {
    if (draggedNode) {
      draggedNode.isDragging = false;
      setDraggedNode(null);
    }
    setIsPanning(false);
  };

  // Zoom Handler (Wheel)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    setZoom((prev) => Math.min(3.2, Math.max(0.35, prev * zoomFactor)));
  };

  // Reset Zoom & Fit
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
    setSearchQuery('');
    setIsMobileSearchOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-3xl bg-[#FAF8F5] border border-[#E2E8F0] overflow-hidden shadow-xs select-none transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen rounded-none' : ''
      }`}
    >
      {/* 1. Header Toolbar (Single Clean Responsive Row - Never Covers the Graph!) */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between gap-2 pointer-events-none">
        {/* Desktop Search Bar */}
        <div className="pointer-events-auto hidden sm:flex items-center gap-2 max-w-xs w-full">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar en el grafo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/95 backdrop-blur-md border border-[#CBD5E1] rounded-2xl pl-8 pr-7 py-1 text-xs text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#7C3AED] shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Overlay (Only visible when toggled) */}
        {isMobileSearchOpen ? (
          <div className="pointer-events-auto flex sm:hidden items-center gap-1.5 flex-1 bg-white/95 backdrop-blur-md border border-[#CBD5E1] p-1.5 rounded-2xl shadow-md animate-fade-in">
            <Search className="w-3.5 h-3.5 text-[#64748B] ml-2 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Buscar nodo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-[#0F172A] placeholder:text-[#64748B] focus:outline-none"
            />
            <button
              onClick={() => {
                setSearchQuery('');
                setIsMobileSearchOpen(false);
              }}
              className="p-1 hover:bg-[#F1F5F9] rounded-xl text-[#64748B] hover:text-[#0F172A] cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Mobile Search Trigger Icon */
          <div className="pointer-events-auto sm:hidden">
            <button
              onClick={() => setIsMobileSearchOpen(true)}
              className={`p-2 bg-white/90 backdrop-blur-md border border-[#CBD5E1] rounded-2xl shadow-xs transition-colors cursor-pointer ${
                searchQuery ? 'text-[#7C3AED] border-[#7C3AED]' : 'text-[#475569]'
              }`}
              title="Buscar en el grafo"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Action Controls Toolbar (Compact & Sleek) */}
        <div className="pointer-events-auto flex items-center gap-1 bg-white/90 backdrop-blur-md border border-[#CBD5E1] px-1.5 py-1 rounded-2xl shadow-xs shrink-0 ml-auto">
          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 text-xs font-extrabold text-[#0F172A]">
            <Network className="w-3.5 h-3.5 text-[#7C3AED]" />
            <span>Grafo</span>
          </div>
          <div className="hidden md:block w-px h-3.5 bg-[#E2E8F0] mx-0.5" />

          {/* Zoom In */}
          <button
            onClick={() => setZoom((prev) => Math.min(3, prev * 1.2))}
            className="p-1.5 hover:bg-[#F1F5F9] rounded-xl text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
            title="Acercar (Zoom In)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => setZoom((prev) => Math.max(0.35, prev * 0.8))}
            className="p-1.5 hover:bg-[#F1F5F9] rounded-xl text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
            title="Alejar (Zoom Out)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Center */}
          <button
            onClick={handleResetView}
            className="p-1.5 hover:bg-[#F1F5F9] rounded-xl text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
            title="Centrar Vista"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-[#E2E8F0] mx-0.5" />

          {/* Physics Play/Pause */}
          <button
            onClick={() => setIsPhysicsRunning(!isPhysicsRunning)}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              isPhysicsRunning ? 'text-[#7C3AED] bg-[#F5F3FF]' : 'text-[#475569] hover:bg-[#F1F5F9]'
            }`}
            title={isPhysicsRunning ? 'Pausar Física' : 'Reanudar Física'}
          >
            {isPhysicsRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Fullscreen */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 hover:bg-[#F1F5F9] rounded-xl text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Ver en pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Bottom High-Contrast Type Filter Pills (Compact & Horizontally Scrollable on PC & Mobile) */}
      <div
        onWheel={(e) => {
          if (e.deltaY !== 0) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
        className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center gap-1.5 tab-scroll-pc pointer-events-auto py-0.5"
      >
        <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md border border-[#CBD5E1] p-1 rounded-2xl shadow-xs shrink-0">
          {[
            { key: 'course', label: GRAPH_PALETTE.course.label, color: GRAPH_PALETTE.course.base, count: courses.length },
            { key: 'work', label: GRAPH_PALETTE.work.label, color: GRAPH_PALETTE.work.base, count: works.length },
            { key: 'concept', label: GRAPH_PALETTE.concept.label, color: GRAPH_PALETTE.concept.base, count: concepts.length },
            { key: 'note', label: GRAPH_PALETTE.note.label, color: GRAPH_PALETTE.note.base, count: notes.length }
          ].map((item) => (
            <button
              key={item.key}
              onClick={() =>
                setFilterTypes((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
              }
              className={`flex items-center gap-1 px-2 py-0.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all whitespace-nowrap ${
                filterTypes[item.key]
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'bg-[#F1F5F9] text-[#94A3B8] opacity-60'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 border border-white"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.label} <span className="opacity-80">({item.count})</span></span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Interactive Canvas with Touch and Mouse support */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className={`w-full block touch-none ${
          draggedNode
            ? 'cursor-grabbing'
            : hoveredNode
            ? 'cursor-pointer'
            : isPanning
            ? 'cursor-grabbing'
            : 'cursor-grab'
        }`}
        style={{
          height: isFullscreen ? '100vh' : window.innerWidth < 640 ? '460px' : '580px'
        }}
      />

      {/* 4. Selected Node Detail Inspector Drawer */}
      {selectedNode && (
        <div className="absolute top-12 right-2.5 left-2.5 sm:left-auto sm:right-3 sm:w-80 z-20 bg-white/98 backdrop-blur-md border border-[#CBD5E1] rounded-3xl shadow-2xl p-4 space-y-2.5 animate-fade-in">
          <div className="flex items-start justify-between gap-2 border-b border-[#E2E8F0] pb-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-white"
                  style={{ backgroundColor: selectedNode.color }}
                />
                <span
                  className="text-[10px] font-extrabold uppercase tracking-wider"
                  style={{ color: selectedNode.color }}
                >
                  {selectedNode.type === 'course'
                    ? 'Asignatura FCCTP'
                    : selectedNode.type === 'work'
                    ? 'Trabajo o Proyecto de Tesis'
                    : selectedNode.type === 'concept'
                    ? 'Concepto Teórico'
                    : 'Nota de Estudio'}
                </span>
              </div>
              <h4 className="font-extrabold text-xs sm:text-sm text-[#0F172A] leading-snug truncate">
                {selectedNode.label}
              </h4>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 hover:bg-[#F1F5F9] rounded-xl text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Node specifics */}
          <div className="text-xs text-[#475569] space-y-2">
            {selectedNode.type === 'note' && (() => {
              const noteItem = selectedNode.rawItem as Note;
              return (
                <>
                  <div className="max-h-44 overflow-y-auto p-3 rounded-2xl bg-[#FAF8F5] border border-[#E2E8F0] shadow-2xs">
                    <FormattedNoteContent
                      content={noteItem.content}
                      notes={notes}
                      concepts={concepts}
                      courses={courses}
                      works={works}
                      onNavigateToNote={(n) => onOpenNote(n)}
                      onNavigateToWork={onOpenWork}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span>
                      Categoría:{' '}
                      <strong>
                        {noteItem.paraCategory === 'ATOMIC'
                          ? 'Idea Rápida'
                          : noteItem.paraCategory === 'PROJECT'
                          ? 'Proyecto / Tesis'
                          : noteItem.paraCategory === 'AREA'
                          ? 'Materia'
                          : noteItem.paraCategory === 'RESOURCE'
                          ? 'Recurso'
                          : 'Archivo'}
                      </strong>
                    </span>
                    <span>{selectedNode.connectionsCount} enlaces</span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onOpenNote(noteItem)}
                    icon={<FileText className="w-3.5 h-3.5" />}
                    className="w-full font-bold"
                  >
                    Leer Nota Completa & Editar
                  </Button>
                </>
              );
            })()}

            {selectedNode.type === 'work' && (() => {
              const workItem = selectedNode.rawItem as Work;
              return (
                <>
                  <div className="space-y-0.5 text-[11px]">
                    <p>
                      Estado:{' '}
                      <strong className="text-[#E11D48]">
                        {workItem.status === 'PLANIFICACION'
                          ? 'Planificación'
                          : workItem.status === 'INVESTIGACION'
                          ? 'Investigando Fuentes'
                          : workItem.status === 'REDACTANDO'
                          ? 'Redactando Borrador'
                          : workItem.status === 'EN_REVISION'
                          ? 'En Revisión'
                          : 'Entregado'}
                      </strong>
                    </p>
                    <p>Entrega: <strong>{new Date(workItem.deadline).toLocaleDateString()}</strong></p>
                  </div>
                  {onOpenWork && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onOpenWork(workItem.id)}
                      icon={<GraduationCap className="w-3.5 h-3.5" />}
                      className="w-full"
                    >
                      Abrir Espacio de Trabajo
                    </Button>
                  )}
                </>
              );
            })()}

            {selectedNode.type === 'course' && (() => {
              const courseItem = selectedNode.rawItem as Course;
              return (
                <div className="space-y-1 text-[11px]">
                  <p>Periodo: <strong>{courseItem.period}</strong></p>
                  {courseItem.teacherName && (
                    <p>Docente: <strong>{courseItem.teacherName}</strong></p>
                  )}
                  <span className="text-[10px] text-[#64748B] block pt-0.5">
                    {selectedNode.connectionsCount} trabajos y notas vinculadas
                  </span>
                </div>
              );
            })()}

            {selectedNode.type === 'concept' && (() => {
              const conceptItem = selectedNode.rawItem as Concept;
              return (
                <div className="space-y-1 text-[11px]">
                  <p className="line-clamp-2">{conceptItem.description || 'Concepto clave de psicología.'}</p>
                  <span className="text-[10px] text-[#64748B] block pt-0.5">
                    {selectedNode.connectionsCount} notas conectadas
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
