// Pre-scripted demo conversation: Diagnostician + OB graph + "Communication Fixer" learner
// Each turn includes agent tool calls that mirror what a real agent would do.

export const DEMO_SCRIPT = [
  {
    agent: {
      message: `Let's explore your understanding of organizational culture and change. Here's a scenario: A mid-sized tech company with a strong engineering culture decides to shift from a product-led to a sales-led go-to-market strategy. Within six months, the initiative is stalling — engineers are quietly deprioritizing sales-related feature requests, the sales team feels unsupported, and leadership is frustrated. What's going on here, and why is this change effort struggling?`,
      toolCalls: [
        { name: 'get_node', input: { node_id: 'culture-change-implementation' } },
        { name: 'get_connections', input: { node_id: 'culture-change-implementation' } },
        { name: 'set_focus_node', input: { node_id: 'culture-change-implementation', reason: 'Starting with the primary learning objective — it has the most prerequisite edges, making it the best entry point for assessment.' } },
        { name: 'update_node_status', input: { node_id: 'culture-change-implementation', status: 'in_progress', evidence: 'Win condition requires a structural explanation that names a specific mechanism blocking the change. Scenario posed — holding judgment until the learner responds.' } },
      ],
    },
    learner: `I think the main issue is a communication problem. Leadership probably didn't do a good job explaining *why* the shift to sales-led was important and what it would mean for the engineering team. When people don't understand the vision behind a change, they resist it. The engineers likely feel like their work is being devalued, and leadership needs to get out in front of that with better messaging and more visibility.`,
  },
  {
    agent: {
      message: `You've identified communication and leadership visibility as factors. Let me probe a bit further: Imagine leadership *did* communicate the vision clearly — town halls, one-on-ones, a detailed FAQ. Engineers understood the rationale. In that scenario, would you expect the resistance to disappear?`,
      toolCalls: [
        { name: 'get_node', input: { node_id: 'structural-vs-individual' } },
        { name: 'set_focus_node', input: { node_id: 'structural-vs-individual', reason: 'The learner defaulted to individual-level explanations (communication, leadership visibility). Probing whether they recognize the structural-vs-individual distinction.' } },
        { name: 'update_node_status', input: { node_id: 'structural-vs-individual', status: 'in_progress', evidence: 'Win condition asks for both an individual- and a structural-level explanation, naming the structural feature doing the causal work. So far entirely individual-level (communication, leadership, vision) — no structural factor named, so not yet met.' } },
      ],
    },
    learner: `Well, not entirely — I think you'd also need buy-in from key influencers on the engineering side. Maybe you bring in engineering leads as champions of the change, have them model the behavior you want. And you'd want to make sure managers are reinforcing the message consistently. Communication isn't just a one-time thing, it's ongoing.`,
  },
  {
    agent: {
      message: `Interesting — you've added more individual-level interventions: champions, managers reinforcing messages. All people-focused. Let me ask it differently: How are these engineers evaluated and promoted? What gets rewarded in the current system?`,
      toolCalls: [
        { name: 'get_connections', input: { node_id: 'structural-vs-individual' } },
        { name: 'get_node', input: { node_id: 'incentive-structures' } },
        { name: 'update_node_status', input: { node_id: 'structural-vs-individual', status: 'gap_detected', evidence: 'Fails the win condition: when challenged, the learner added more individual-level fixes (champions, managers) instead of naming a structural cause. Stops at "leadership/communication" rather than the structural feature doing the causal work.', trace_to: 'structural-vs-individual' } },
        { name: 'set_focus_node', input: { node_id: 'incentive-structures', reason: 'Tracing to prerequisite: testing whether the learner recognizes structural drivers like incentive misalignment.' } },
      ],
    },
    learner: `Hmm, good question. In most engineering cultures, promotions are based on technical impact — shipping features, code quality, system reliability. If you're suddenly asking engineers to prioritize sales-driven requests, that might not align with how they've been told success is measured. So there could be a disconnect there between what leadership is asking for and what the incentive system actually rewards.`,
  },
  {
    agent: {
      message: `Now you're touching on something important — the incentive structure. If engineers are evaluated on technical impact but asked to prioritize sales features, what does that tell us about their resistance? Is it irrational, or is something else going on?`,
      toolCalls: [
        { name: 'get_node', input: { node_id: 'resistance-to-change' } },
        { name: 'update_node_status', input: { node_id: 'incentive-structures', status: 'in_progress', evidence: 'Win condition asks them to identify a stated-goal vs. actual-incentive misalignment and how it shapes behavior. They named the promotion-criteria misalignment — but only when directly prompted, so partially met.' } },
        { name: 'set_focus_node', input: { node_id: 'resistance-to-change', reason: 'The learner identified incentive misalignment when prompted. Now testing whether they can connect this to a reframing of resistance as rational behavior.' } },
      ],
    },
    learner: `I mean, I guess it's somewhat rational in the sense that they're protecting their careers. But I still think a lot of resistance comes from fear of the unknown and just general human reluctance to change. If leadership explained how the new priorities would factor into evaluations, and maybe adjusted the promotion criteria, that would go a long way.`,
  },
  {
    agent: {
      message: `You said "somewhat rational" — let's stay there. You mentioned the engineers are protecting their careers given how promotions work. If you set aside individual attitudes entirely and looked only at the *system* — the incentive structures, the power dynamics, the feedback loops — could you explain the resistance without referencing any individual's attitude or fear?`,
      toolCalls: [
        { name: 'update_node_status', input: { node_id: 'resistance-to-change', status: 'in_progress', evidence: 'Win condition asks them to reframe resistance as rational given incentives or mental models, not fear or bad attitude. They concede it is "somewhat rational" but still fall back on "fear of the unknown" — partially met.' } },
        { name: 'get_evidence_state', input: {} },
      ],
    },
    learner: `That's an interesting thought experiment. I suppose you could say the system is set up so that the rational move for any engineer is to keep doing what gets rewarded — technical work. And if sales-driven features don't count toward promotion, then every engineer independently arrives at the same conclusion: deprioritize them. So it looks like collective resistance but it's actually just everyone responding rationally to the same incentive structure. I hadn't really thought about it that way before.`,
  },
  {
    agent: {
      message: `Good. Now let's shift. When you think about the culture of this engineering organization, how would you describe it? What makes up that culture?`,
      toolCalls: [
        { name: 'update_node_status', input: { node_id: 'incentive-structures', status: 'demonstrated', evidence: 'Meets the win condition: articulated how the promotion/incentive misalignment drives the deprioritization behavior. Needed scaffolding to get there, but the structural mechanism is clearly stated.' } },
        { name: 'update_node_status', input: { node_id: 'resistance-to-change', status: 'in_progress', evidence: 'Now approaching the win condition — reframed the resistance as every engineer rationally responding to the same incentive structure. But heavily scaffolded, so not yet independently met.' } },
        { name: 'get_node', input: { node_id: 'scheins-levels' } },
        { name: 'set_focus_node', input: { node_id: 'scheins-levels', reason: 'Moving to Schein\'s three levels. Testing whether the learner analyzes culture at all three levels or stays surface-level.' } },
      ],
    },
    learner: `The culture is defined by their values — things like technical excellence, innovation, engineering autonomy. You can see it in their mission statement, their hiring criteria, probably their company values on the website. They value building great products and giving engineers freedom to solve hard problems. That's the culture, and the sales-led shift threatens it.`,
  },
  {
    agent: {
      message: `You've described what the organization *says* it values. Schein would call those "espoused values." But he distinguishes three levels of culture: artifacts — the visible stuff; espoused values — what people say; and underlying assumptions — the deep, often unconscious beliefs. When you described culture just now, which level were you operating at? And what might the underlying assumptions be that you're not seeing?`,
      toolCalls: [
        { name: 'update_node_status', input: { node_id: 'scheins-levels', status: 'in_progress', evidence: 'Win condition asks them to place cultural details at the right level and see espoused values diverging from actual assumptions. They described culture through espoused values only (mission, hiring, stated values), conflating what the org says with what it does. Not yet met.' } },
      ],
    },
    learner: `Fair point — I was mostly talking about espoused values. The underlying assumptions... those would be harder to see. Maybe things like "engineering is the most important function" or "the best ideas come from technical people, not salespeople." Those might be beliefs that nobody says out loud but that shape how engineers react to being told sales should drive priorities. That's a deeper level than what's on the website.`,
  },
  {
    agent: {
      message: `I think I have a good picture of where you are. Let me share what I've mapped. You have a strong instinct toward individual-level explanations — communication, leadership, buy-in — and that's your default frame. When prompted, you *can* reason structurally about incentive systems and recognize resistance as rational, but you don't go there independently yet. On culture, you initially described it through espoused values but showed you can engage with deeper levels when the framework is introduced. Your understanding of systems thinking and mental models hasn't been directly assessed, but your pattern of individual-level defaults suggests these are areas worth exploring further. Thank you for a thoughtful conversation.`,
      toolCalls: [
        { name: 'update_node_status', input: { node_id: 'scheins-levels', status: 'demonstrated', evidence: 'Meets the win condition once the framework was named: correctly separated espoused values from the underlying assumptions ("engineering is the most important function") that actually drive behavior.' } },
        { name: 'update_node_status', input: { node_id: 'resistance-to-change', status: 'demonstrated', evidence: 'Win condition met under scaffolding: reframed the specific resistance as rational given the incentive structure rather than fear or bad attitude. Genuine shift, though durability is uncertain.' } },
        { name: 'update_node_status', input: { node_id: 'culture-change-implementation', status: 'gap_detected', evidence: 'Fails the win condition: cannot independently explain the stalled change through a specific structural mechanism — defaults to individual factors and only reasons structurally when guided. Traces back to the structural-vs-individual distinction.', trace_to: 'structural-vs-individual' } },
        { name: 'update_node_status', input: { node_id: 'systems-thinking', status: 'gap_detected', evidence: 'Win condition asks them to trace a feedback loop or unintended consequence rather than linear "fix A to fix B" reasoning. Never surfaced a feedback loop spontaneously; reasoning stayed linear — inferred gap.', trace_to: 'systems-thinking' } },
        { name: 'get_evidence_state', input: {} },
        { name: 'conclude_assessment', input: { summary: 'Measured against each node\'s win condition: incentive-structures, resistance-to-change, and Schein\'s levels are met, but only under scaffolding. The primary objective (culture-change) and structural-vs-individual fail their win conditions — the learner cannot independently name the structural mechanism and defaults to individual explanations. Systems thinking gap inferred; mental models not assessed.' } },
      ],
    },
    learner: null,
  },
];
