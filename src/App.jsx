import React, { useReducer, useCallback, useEffect, useRef, useState } from 'react';
import Landing from './components/Landing.jsx';
import KnowledgeGraph from './components/KnowledgeGraph.jsx';
import Conversation from './components/Conversation.jsx';
import EvidenceMap from './components/EvidenceMap.jsx';
import UnderTheHood from './components/UnderTheHood.jsx';
import LearnerBuilder from './components/LearnerBuilder.jsx';
import AgentBuilder from './components/AgentBuilder.jsx';
import obGraph from './data/ob-graph.json';
import { sendMessage, runAgentLoop } from './utils/api';
import { buildAgentSystemPrompt, TOOL_DEFINITIONS } from './prompts/agents';
import { SIMULATED_LEARNER_PROMPT, buildCustomLearnerPrompt } from './prompts/simulated-learner';
import { DEMO_SCRIPT } from './data/demo-script';
import tutorStarter from './prompts/tutor.md?raw';

const DEFAULT_CUSTOM_LEARNER = {
  overconfident: false, hesitant: false,
  verbose: false, terse: false,
  resistant: false, receptive: false,
  surfaceVocab: false, conflates: false,
  concreteOnly: false, turnsQuestionsAround: false,
  patternFirst: false, needsStructure: false,
  collectivist: false, highContext: false, authorityDeferring: false,
  otherTendency: '',
};

const DEFAULT_CUSTOM_AGENT = {
  warmTone: false, neutralTone: false,
  assessOnly: false, teachWhileAssessing: false,
  questionFirst: false, productiveStruggle: false,
  noFalseConfirm: false, praiseProcess: false,
  traceToPrereqs: false, explainDirectly: false, surfaceMisconceptions: false,
  otherPrinciple: '',
  useFullPrompt: false, // false = guided toggles, true = write-your-own tutor.md prompt
  fullPrompt: tutorStarter, // seeded from src/prompts/tutor.md; editable in the UI
};

const MAX_TURNS = 10; // Max exchanges per session (applies to API modes, not demo)

const initialState = {
  screen: 'landing', // 'landing' | 'main'
  graph: null,
  agent: 'diagnostician', // 'diagnostician' | 'socratic' | 'direct' | 'custom'
  mode: 'learner', // 'learner' | 'simulated' | 'custom' | 'demo'
  customLearner: { ...DEFAULT_CUSTOM_LEARNER },
  customAgent: { ...DEFAULT_CUSTOM_AGENT },
  conversation: [], // { role, content, hidden? } — what gets sent to the API
  displayMessages: [], // { role, content } — what the user sees in the chat
  evidenceMap: {}, // nodeId -> { status, evidence, trace_to }
  currentNode: null,
  startNode: null, // optional: node the user clicked to seed where the agent begins
  toolCallLog: [], // tool calls from the most recent agent turn
  isLoading: false,
  loadingActor: null, // 'agent' | 'learner' | null — who is currently generating
  started: false,
  demoTurnIndex: 0,
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_GRAPH':
      return {
        ...state,
        screen: 'main',
        graph: action.graph,
        isDemoGraph: action.isDemo || false,
        conversation: [],
        displayMessages: [],
        evidenceMap: {},
        currentNode: null,
        startNode: null,
        toolCallLog: [],
        started: false,
      };
    case 'SET_AGENT':
      return { ...state, agent: action.agent };
    case 'SET_MODE':
      return { ...state, mode: action.mode };
    case 'TOGGLE_LEARNER_TRAIT': {
      const next = { ...state.customLearner, [action.key]: !state.customLearner[action.key] };
      // If we just turned a trait on, clear its mutually-exclusive partner.
      if (next[action.key] && action.pair && next[action.pair]) {
        next[action.pair] = false;
      }
      return { ...state, customLearner: next };
    }
    case 'SET_LEARNER_OTHER':
      return { ...state, customLearner: { ...state.customLearner, otherTendency: action.value } };
    case 'TOGGLE_AGENT_MOVE': {
      const next = { ...state.customAgent, [action.key]: !state.customAgent[action.key] };
      // If we just turned a move on, clear its mutually-exclusive partner.
      if (next[action.key] && action.pair && next[action.pair]) {
        next[action.pair] = false;
      }
      return { ...state, customAgent: next };
    }
    case 'SET_AGENT_OTHER':
      return { ...state, customAgent: { ...state.customAgent, otherPrinciple: action.value } };
    case 'SET_AGENT_INPUT_MODE':
      return { ...state, customAgent: { ...state.customAgent, useFullPrompt: action.useFullPrompt } };
    case 'SET_AGENT_FULL_PROMPT':
      return { ...state, customAgent: { ...state.customAgent, fullPrompt: action.value } };
    case 'START_SESSION':
      return { ...state, started: true };
    case 'ADD_CONVERSATION_MESSAGES':
      return { ...state, conversation: [...state.conversation, ...action.messages] };
    case 'ADD_DISPLAY_MESSAGE':
      return { ...state, displayMessages: [...state.displayMessages, action.message] };
    case 'UPDATE_EVIDENCE': {
      const newMap = { ...state.evidenceMap };
      newMap[action.node_id] = {
        status: action.status,
        evidence: action.evidence,
        trace_to: action.trace_to || null,
      };
      return { ...state, evidenceMap: newMap };
    }
    case 'SET_CURRENT_NODE':
      return { ...state, currentNode: action.node_id };
    case 'SET_START_NODE':
      // Seed both the start node and the visible focus highlight before the session begins.
      return { ...state, startNode: action.node_id, currentNode: action.node_id };
    case 'SET_TOOL_LOG':
      return { ...state, toolCallLog: action.log };
    case 'ADD_TOOL_CALL':
      return { ...state, toolCallLog: [...state.toolCallLog, action.call] };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.isLoading,
        loadingActor: action.isLoading ? (action.actor || 'agent') : null,
      };
    case 'SET_DEMO_INDEX':
      return { ...state, demoTurnIndex: action.index };
    case 'NEW_SESSION':
      return {
        ...state,
        conversation: [],
        displayMessages: [],
        evidenceMap: {},
        currentNode: null,
        startNode: null,
        toolCallLog: [],
        started: false,
        demoTurnIndex: 0,
      };
    case 'BACK_TO_LANDING':
      return { ...initialState };
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [showUnderTheHood, setShowUnderTheHood] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const startedRef = useRef(false);
  // Refs to give the tool callback access to current state without stale closures
  const graphRef = useRef(null);
  const evidenceMapRef = useRef({});

  useEffect(() => { graphRef.current = state.graph; }, [state.graph]);
  useEffect(() => { evidenceMapRef.current = state.evidenceMap; }, [state.evidenceMap]);

  // Execute a tool call against local state
  const executeTool = useCallback((toolName, input) => {
    const graph = graphRef.current;
    const evidenceMap = evidenceMapRef.current;

    switch (toolName) {
      case 'get_node': {
        const node = graph?.nodes.find((n) => n.id === input.node_id);
        if (!node) return JSON.stringify({ error: `Node '${input.node_id}' not found` });
        return JSON.stringify({
          id: node.id,
          label: node.label,
          type: node.type,
          description: node.description || 'No description available',
          win_condition: node.win_condition || null,
          difficulty: node.difficulty || 'not specified',
          estimated_minutes: node.estimated_minutes || null,
          misconceptions: node.misconceptions || [],
        });
      }
      case 'get_connections': {
        const edges = graph?.edges.filter(
          (e) => e.source === input.node_id || e.target === input.node_id
        ) || [];
        return JSON.stringify({
          node_id: input.node_id,
          connections: edges.map((e) => ({
            from: e.source,
            to: e.target,
            relationship: e.relationship,
            description: e.description || '',
            direction: e.source === input.node_id ? 'outgoing' : 'incoming',
          })),
        });
      }
      case 'get_evidence_state': {
        const allNodes = graph?.nodes || [];
        const state_map = allNodes.map((n) => ({
          node_id: n.id,
          label: n.label,
          status: evidenceMap[n.id]?.status || 'not_assessed',
          evidence: evidenceMap[n.id]?.evidence || null,
          trace_to: evidenceMap[n.id]?.trace_to || null,
        }));
        return JSON.stringify({ evidence: state_map });
      }
      case 'update_node_status': {
        dispatch({
          type: 'UPDATE_EVIDENCE',
          node_id: input.node_id,
          status: input.status,
          evidence: input.evidence,
          trace_to: input.trace_to || null,
        });
        return JSON.stringify({ success: true, node_id: input.node_id, status: input.status });
      }
      case 'set_focus_node': {
        dispatch({ type: 'SET_CURRENT_NODE', node_id: input.node_id });
        return JSON.stringify({ success: true, focused_on: input.node_id });
      }
      case 'conclude_assessment': {
        return JSON.stringify({ success: true, summary: input.summary });
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  }, []);

  const callAgent = useCallback(async (conversationMessages) => {
    const systemPrompt = buildAgentSystemPrompt(state.agent, state.graph, state.customAgent);
    dispatch({ type: 'SET_LOADING', isLoading: true, actor: 'agent' });
    dispatch({ type: 'SET_TOOL_LOG', log: [] });

    try {
      // Build API messages: only role + content (strip hidden flag, etc.)
      const apiMessages = conversationMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { message, toolCalls } = await runAgentLoop({
        system: systemPrompt,
        messages: apiMessages,
        tools: TOOL_DEFINITIONS,
        onToolCall: executeTool,
        onToolLog: (call) => dispatch({ type: 'ADD_TOOL_CALL', call }),
      });

      // Add assistant response to both conversation (for API context) and display
      dispatch({
        type: 'ADD_CONVERSATION_MESSAGES',
        messages: [{ role: 'assistant', content: message }],
      });
      dispatch({
        type: 'ADD_DISPLAY_MESSAGE',
        message: { role: 'assistant', content: message },
      });

      return message;
    } catch (err) {
      const errorMsg = `Error: ${err.message}. Please try again.`;
      dispatch({ type: 'ADD_DISPLAY_MESSAGE', message: { role: 'assistant', content: errorMsg } });
      dispatch({ type: 'ADD_CONVERSATION_MESSAGES', messages: [{ role: 'assistant', content: errorMsg }] });
    } finally {
      dispatch({ type: 'SET_LOADING', isLoading: false });
    }
  }, [state.agent, state.graph, state.customAgent, executeTool]);

  // Auto-send first agent message when session starts
  useEffect(() => {
    if (state.started && state.conversation.length === 0 && !startedRef.current) {
      startedRef.current = true;
      if (state.mode === 'demo') {
        playDemoTurn(0);
      } else {
        let initContent = 'Begin the assessment.';
        if (state.startNode) {
          const node = state.graph?.nodes.find((n) => n.id === state.startNode);
          const label = node?.label || state.startNode;
          initContent = `Begin the assessment. Start with the concept "${label}" (node id: ${state.startNode}): set your focus there first, then explore outward from it.`;
        }
        const initMsg = { role: 'user', content: initContent };
        dispatch({ type: 'ADD_CONVERSATION_MESSAGES', messages: [initMsg] });
        // Don't add to displayMessages — this is a hidden prompt
        callAgent([initMsg]);
      }
    }
  }, [state.started]);

  const playDemoTurn = useCallback((turnIndex) => {
    const turn = DEMO_SCRIPT[turnIndex];
    if (!turn) return;

    // Play tool calls from demo script
    if (turn.agent.toolCalls) {
      dispatch({ type: 'SET_TOOL_LOG', log: turn.agent.toolCalls });
      turn.agent.toolCalls.forEach((tc) => {
        executeTool(tc.name, tc.input);
      });
    }

    dispatch({ type: 'ADD_DISPLAY_MESSAGE', message: { role: 'assistant', content: turn.agent.message } });
    dispatch({
      type: 'ADD_CONVERSATION_MESSAGES',
      messages: [{ role: 'assistant', content: turn.agent.message }],
    });
    dispatch({ type: 'SET_DEMO_INDEX', index: turnIndex + 1 });
  }, [executeTool]);

  const turnCount = state.displayMessages.filter((m) => m.role === 'user').length;
  const turnLimitReached = turnCount >= MAX_TURNS;

  const handleSendMessage = useCallback(async (text) => {
    if (turnLimitReached) return;
    const userMsg = { role: 'user', content: text };
    dispatch({ type: 'ADD_CONVERSATION_MESSAGES', messages: [userMsg] });
    dispatch({ type: 'ADD_DISPLAY_MESSAGE', message: userMsg });
    const allMessages = [...state.conversation, userMsg];
    await callAgent(allMessages);
  }, [state.conversation, callAgent, turnLimitReached]);

  const handleNextTurn = useCallback(async () => {
    if (state.isLoading) return;
    if (state.mode !== 'demo' && turnLimitReached) {
      dispatch({
        type: 'ADD_DISPLAY_MESSAGE',
        message: { role: 'assistant', content: `This session has reached the ${MAX_TURNS}-turn limit. Click "New session" to start over.` },
      });
      return;
    }

    // Demo mode: play back scripted turns
    if (state.mode === 'demo') {
      const prevTurnIndex = state.demoTurnIndex - 1;
      const prevTurn = DEMO_SCRIPT[prevTurnIndex];
      if (prevTurn && prevTurn.learner) {
        const learnerMsg = { role: 'user', content: prevTurn.learner };
        dispatch({ type: 'ADD_DISPLAY_MESSAGE', message: learnerMsg });
        dispatch({ type: 'ADD_CONVERSATION_MESSAGES', messages: [learnerMsg] });
        setTimeout(() => playDemoTurn(state.demoTurnIndex), 500);
      }
      return;
    }

    // Simulated learner mode: API calls
    const lastAgentMsg = [...state.displayMessages].reverse().find((m) => m.role === 'assistant');
    if (!lastAgentMsg) return;

    dispatch({ type: 'SET_LOADING', isLoading: true, actor: 'learner' });
    try {
      // For the simulated learner, flip roles: agent messages become "user" (what the learner sees)
      const learnerMessages = state.conversation.map((m) => ({
        role: m.role === 'assistant' ? 'user' : 'assistant',
        content: m.content,
      }));

      const learnerSystem = state.mode === 'custom'
        ? buildCustomLearnerPrompt(state.customLearner)
        : SIMULATED_LEARNER_PROMPT;

      const response = await sendMessage({
        system: learnerSystem,
        messages: learnerMessages,
        max_tokens: 256,
      });
      const learnerReply = response.content[0].text;
      dispatch({ type: 'SET_LOADING', isLoading: false });

      const learnerMsg = { role: 'user', content: learnerReply };
      dispatch({ type: 'ADD_CONVERSATION_MESSAGES', messages: [learnerMsg] });
      dispatch({ type: 'ADD_DISPLAY_MESSAGE', message: learnerMsg });

      const allMessages = [...state.conversation, learnerMsg];
      await callAgent(allMessages);
    } catch (err) {
      dispatch({ type: 'SET_LOADING', isLoading: false });
      const errorMsg = `[Simulated learner error: ${err.message}]`;
      dispatch({ type: 'ADD_DISPLAY_MESSAGE', message: { role: 'user', content: errorMsg } });
    }
  }, [state.conversation, state.displayMessages, state.isLoading, state.mode, state.customLearner, state.demoTurnIndex, turnLimitReached, callAgent, playDemoTurn]);

  if (state.screen === 'landing') {
    return (
      <Landing
        onSelectDemo={() => dispatch({ type: 'LOAD_GRAPH', graph: obGraph, isDemo: true })}
        onUploadGraph={(graph) => dispatch({ type: 'LOAD_GRAPH', graph })}
      />
    );
  }

  return (
    <div style={styles.root}>
      <div style={styles.toolbar}>
        <button
          style={styles.toolbarTitle}
          onClick={() => { startedRef.current = false; dispatch({ type: 'BACK_TO_LANDING' }); }}
          title="Back to home"
        >
          ← {state.graph?.metadata?.title || 'Knowledge Graph'}
        </button>
        <div style={styles.toolbarControls}>
          <label style={styles.label}>
            Agent:
            <select
              style={styles.select}
              value={state.agent}
              onChange={(e) => {
                const v = e.target.value;
                dispatch({ type: 'SET_AGENT', agent: v });
                if (v === 'custom') setShowBuilder(true);
              }}
              disabled={state.started}
            >
              <option value="diagnostician">Diagnostician</option>
              <option value="socratic">Socratic Tutor</option>
              <option value="direct">Direct Instructor</option>
              <option value="custom">Custom agent</option>
            </select>
          </label>
          <label style={styles.label}>
            Mode:
            <select
              style={styles.select}
              value={state.mode}
              onChange={(e) => {
                const v = e.target.value;
                dispatch({ type: 'SET_MODE', mode: v });
                if (v === 'custom') setShowBuilder(true);
              }}
              disabled={state.started}
            >
              <option value="learner">Play as learner</option>
              <option value="simulated">Simulated learner</option>
              <option value="custom">Custom simulated learner</option>
              {state.isDemoGraph && <option value="demo">Demo mode</option>}
            </select>
          </label>
          {!state.started && (state.agent === 'custom' || state.mode === 'custom') && (
            <button style={styles.newBtn} onClick={() => setShowBuilder(true)}>
              Configure
            </button>
          )}
          <button style={styles.newBtn} onClick={() => setShowUnderTheHood(true)}>
            Under the Hood
          </button>
          {!state.started ? (
            <button style={styles.startBtn} onClick={() => dispatch({ type: 'START_SESSION' })}>
              Start
            </button>
          ) : (
            <button style={styles.newBtn} onClick={() => { startedRef.current = false; dispatch({ type: 'NEW_SESSION' }); }}>
              New session
            </button>
          )}
        </div>
      </div>
      {showBuilder && !state.started && (state.agent === 'custom' || state.mode === 'custom') && (
        <div style={styles.builderOverlay} onClick={() => setShowBuilder(false)}>
          <div style={styles.builderModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.builderModalBar}>
              <div style={styles.builderModalTitle}>Configure your session</div>
              <button style={styles.startBtn} onClick={() => setShowBuilder(false)}>Done</button>
            </div>
            {state.agent === 'custom' && (
              <AgentBuilder
                moves={state.customAgent}
                onToggle={(key, pair) => dispatch({ type: 'TOGGLE_AGENT_MOVE', key, pair })}
                onSetOther={(value) => dispatch({ type: 'SET_AGENT_OTHER', value })}
                onSetInputMode={(useFullPrompt) => dispatch({ type: 'SET_AGENT_INPUT_MODE', useFullPrompt })}
                onSetFullPrompt={(value) => dispatch({ type: 'SET_AGENT_FULL_PROMPT', value })}
                disabled={state.started}
              />
            )}
            {state.mode === 'custom' && (
              <LearnerBuilder
                traits={state.customLearner}
                onToggle={(key, pair) => dispatch({ type: 'TOGGLE_LEARNER_TRAIT', key, pair })}
                onSetOther={(value) => dispatch({ type: 'SET_LEARNER_OTHER', value })}
                disabled={state.started}
              />
            )}
          </div>
        </div>
      )}
      <div style={styles.panels}>
        <div style={styles.panelLeft}>
          <div style={styles.panelHeader}>KNOWLEDGE GRAPH</div>
          <div style={{ ...styles.panelBody, padding: 0 }}>
            <KnowledgeGraph
              graph={state.graph}
              evidenceMap={state.evidenceMap}
              currentNode={state.currentNode}
              selectable={!state.started && state.mode !== 'demo'}
              startNode={state.startNode}
              onSelectStart={(id) => dispatch({ type: 'SET_START_NODE', node_id: id })}
            />
          </div>
        </div>
        <div style={styles.panelCenter}>
          <div style={styles.panelHeader}>CONVERSATION</div>
          <div style={{ ...styles.panelBody, padding: 0 }}>
            <Conversation
              conversation={state.displayMessages}
              agent={state.agent}
              mode={state.mode}
              started={state.started}
              isLoading={state.isLoading}
              loadingActor={state.loadingActor}
              toolCallLog={state.toolCallLog}
              turnLimitReached={turnLimitReached}
              onSendMessage={handleSendMessage}
              onNextTurn={handleNextTurn}
            />
          </div>
        </div>
        <div style={styles.panelRight}>
          <div style={styles.panelHeader}>EVIDENCE MAP</div>
          <div style={styles.panelBody}>
            <EvidenceMap
              graph={state.graph}
              evidenceMap={state.evidenceMap}
            />
          </div>
        </div>
      </div>
      {showUnderTheHood && (
        <UnderTheHood
          systemPrompt={buildAgentSystemPrompt(state.agent, state.graph, state.customAgent)}
          learnerPrompt={
            state.mode === 'custom'
              ? buildCustomLearnerPrompt(state.customLearner)
              : SIMULATED_LEARNER_PROMPT
          }
          learnerMode={state.mode}
          toolDefinitions={TOOL_DEFINITIONS}
          graph={state.graph}
          onClose={() => setShowUnderTheHood(false)}
        />
      )}
    </div>
  );
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    borderBottom: '1px solid #e2e8f0',
    background: '#ffffff',
    flexShrink: 0,
  },
  toolbarTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#0f172a',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    fontFamily: 'inherit',
  },
  toolbarControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  label: {
    fontSize: 14,
    color: '#475569',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  select: {
    fontSize: 14,
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#1e293b',
  },
  startBtn: {
    padding: '8px 20px',
    fontSize: 14,
    fontWeight: 600,
    background: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  newBtn: {
    padding: '8px 20px',
    fontSize: 14,
    fontWeight: 600,
    background: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    cursor: 'pointer',
  },
  panels: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  panelLeft: {
    width: '30%',
    borderRight: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
  },
  panelCenter: {
    width: '40%',
    borderRight: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
  },
  panelRight: {
    width: '30%',
    display: 'flex',
    flexDirection: 'column',
  },
  panelHeader: {
    fontSize: 14,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '12px 16px',
    borderBottom: '1px solid #e2e8f0',
    color: '#475569',
    flexShrink: 0,
  },
  panelBody: {
    flex: 1,
    overflow: 'auto',
    padding: 16,
  },
  builderOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.5)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '32px 20px',
    overflowY: 'auto',
    zIndex: 200,
  },
  builderModal: {
    width: '100%',
    maxWidth: 1140,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  builderModalBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '14px 20px',
    background: '#ffffff',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
  },
  builderModalTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#0f172a',
  },
};
