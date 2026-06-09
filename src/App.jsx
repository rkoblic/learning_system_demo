import React, { useReducer, useCallback, useEffect, useRef, useState } from 'react';
import Landing from './components/Landing.jsx';
import KnowledgeGraph from './components/KnowledgeGraph.jsx';
import Conversation from './components/Conversation.jsx';
import EvidenceMap from './components/EvidenceMap.jsx';
import UnderTheHood from './components/UnderTheHood.jsx';
import LearnerBuilder from './components/LearnerBuilder.jsx';
import obGraph from './data/ob-graph.json';
import { sendMessage, runAgentLoop } from './utils/api';
import { buildAgentSystemPrompt, TOOL_DEFINITIONS } from './prompts/agents';
import { SIMULATED_LEARNER_PROMPT, buildCustomLearnerPrompt } from './prompts/simulated-learner';
import { DEMO_SCRIPT } from './data/demo-script';

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

const MAX_TURNS = 10; // Max exchanges per session (applies to API modes, not demo)

const initialState = {
  screen: 'landing', // 'landing' | 'main'
  graph: null,
  agent: 'diagnostician',
  mode: 'learner', // 'learner' | 'simulated' | 'custom' | 'demo'
  customLearner: { ...DEFAULT_CUSTOM_LEARNER },
  conversation: [], // { role, content, hidden? } — what gets sent to the API
  displayMessages: [], // { role, content } — what the user sees in the chat
  evidenceMap: {}, // nodeId -> { status, evidence, trace_to }
  currentNode: null,
  toolCallLog: [], // tool calls from the most recent agent turn
  isLoading: false,
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
    case 'SET_TOOL_LOG':
      return { ...state, toolCallLog: action.log };
    case 'ADD_TOOL_CALL':
      return { ...state, toolCallLog: [...state.toolCallLog, action.call] };
    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };
    case 'SET_DEMO_INDEX':
      return { ...state, demoTurnIndex: action.index };
    case 'NEW_SESSION':
      return {
        ...state,
        conversation: [],
        displayMessages: [],
        evidenceMap: {},
        currentNode: null,
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
    const systemPrompt = buildAgentSystemPrompt(state.agent, state.graph);
    dispatch({ type: 'SET_LOADING', isLoading: true });
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
  }, [state.agent, state.graph, executeTool]);

  // Auto-send first agent message when session starts
  useEffect(() => {
    if (state.started && state.conversation.length === 0 && !startedRef.current) {
      startedRef.current = true;
      if (state.mode === 'demo') {
        playDemoTurn(0);
      } else {
        const initMsg = { role: 'user', content: 'Begin the assessment.' };
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

    dispatch({ type: 'SET_LOADING', isLoading: true });
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
              onChange={(e) => dispatch({ type: 'SET_AGENT', agent: e.target.value })}
              disabled={state.started}
            >
              <option value="diagnostician">Diagnostician</option>
              <option value="socratic">Socratic Tutor</option>
              <option value="direct">Direct Instructor</option>
            </select>
          </label>
          <label style={styles.label}>
            Mode:
            <select
              style={styles.select}
              value={state.mode}
              onChange={(e) => dispatch({ type: 'SET_MODE', mode: e.target.value })}
              disabled={state.started}
            >
              <option value="learner">Play as learner</option>
              <option value="simulated">Simulated learner</option>
              <option value="custom">Custom simulated learner</option>
              {state.isDemoGraph && <option value="demo">Demo mode</option>}
            </select>
          </label>
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
      {state.mode === 'custom' && !state.started && (
        <LearnerBuilder
          traits={state.customLearner}
          onToggle={(key, pair) => dispatch({ type: 'TOGGLE_LEARNER_TRAIT', key, pair })}
          onSetOther={(value) => dispatch({ type: 'SET_LEARNER_OTHER', value })}
          disabled={state.started}
        />
      )}
      <div style={styles.panels}>
        <div style={styles.panelLeft}>
          <div style={styles.panelHeader}>KNOWLEDGE GRAPH</div>
          <div style={{ ...styles.panelBody, padding: 0 }}>
            <KnowledgeGraph
              graph={state.graph}
              evidenceMap={state.evidenceMap}
              currentNode={state.currentNode}
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
          systemPrompt={buildAgentSystemPrompt(state.agent, state.graph)}
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
};
