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
        { name: 'update_node_status', input: { node_id: 'culture-change-implementation', status: 'in_progress', evidence: 'Initial probe — awaiting learner\'s analysis of culture-change scenario.' } },
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
        { name: 'update_node_status', input: { node_id: 'structural-vs-individual', status: 'in_progress', evidence: 'Learner\'s initial response was entirely individual-level: communication, leadership messaging, vision. No mention of structural factors.' } },
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
        { name: 'update_node_status', input: { node_id: 'structural-vs-individual', status: 'gap_detected', evidence: 'When challenged, learner added more individual-level solutions (champions, managers) rather than shifting to structural analysis. Consistent pattern of individual-level default.', trace_to: 'structural-vs-individual' } },
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
        { name: 'update_node_status', input: { node_id: 'incentive-structures', status: 'in_progress', evidence: 'When directly prompted about evaluation/promotion criteria, learner identified the misalignment between stated goals and reward systems. Required prompting — did not surface this independently.' } },
        { name: 'set_focus_node', input: { node_id: 'resistance-to-change', reason: 'The learner identified incentive misalignment when prompted. Now testing whether they can connect this to a reframing of resistance as rational behavior.' } },
      ],
    },
    learner: `I mean, I guess it's somewhat rational in the sense that they're protecting their careers. But I still think a lot of resistance comes from fear of the unknown and just general human reluctance to change. If leadership explained how the new priorities would factor into evaluations, and maybe adjusted the promotion criteria, that would go a long way.`,
  },
  {
    agent: {
      message: `You said "somewhat rational" — let's stay there. You mentioned the engineers are protecting their careers given how promotions work. If you set aside individual attitudes entirely and looked only at the *system* — the incentive structures, the power dynamics, the feedback loops — could you explain the resistance without referencing any individual's attitude or fear?`,
      toolCalls: [
        { name: 'update_node_status', input: { node_id: 'resistance-to-change', status: 'in_progress', evidence: 'Learner acknowledged resistance is "somewhat rational" given incentives but still defaults to "fear of the unknown" and individual reluctance. Partially grasps rational resistance but hasn\'t fully internalized it.' } },
        { name: 'get_evidence_state', input: {} },
      ],
    },
    learner: `That's an interesting thought experiment. I suppose you could say the system is set up so that the rational move for any engineer is to keep doing what gets rewarded — technical work. And if sales-driven features don't count toward promotion, then every engineer independently arrives at the same conclusion: deprioritize them. So it looks like collective resistance but it's actually just everyone responding rationally to the same incentive structure. I hadn't really thought about it that way before.`,
  },
  {
    agent: {
      message: `Good. Now let's shift. When you think about the culture of this engineering organization, how would you describe it? What makes up that culture?`,
      toolCalls: [
        { name: 'update_node_status', input: { node_id: 'incentive-structures', status: 'demonstrated', evidence: 'When prompted, identified incentive misalignment as driver of behavior. Required scaffolding but articulated the structural mechanism clearly.' } },
        { name: 'update_node_status', input: { node_id: 'resistance-to-change', status: 'in_progress', evidence: 'Showed genuine shift in understanding — articulated resistance as rational structural response. But this was heavily scaffolded; unclear if the insight is durable.' } },
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
        { name: 'update_node_status', input: { node_id: 'scheins-levels', status: 'in_progress', evidence: 'Described culture through espoused values only — mission statement, hiring criteria, company values. Conflated what the organization says with what it actually does.' } },
      ],
    },
    learner: `Fair point — I was mostly talking about espoused values. The underlying assumptions... those would be harder to see. Maybe things like "engineering is the most important function" or "the best ideas come from technical people, not salespeople." Those might be beliefs that nobody says out loud but that shape how engineers react to being told sales should drive priorities. That's a deeper level than what's on the website.`,
  },
  {
    agent: {
      message: `I think I have a good picture of where you are. Let me share what I've mapped. You have a strong instinct toward individual-level explanations — communication, leadership, buy-in — and that's your default frame. When prompted, you *can* reason structurally about incentive systems and recognize resistance as rational, but you don't go there independently yet. On culture, you initially described it through espoused values but showed you can engage with deeper levels when the framework is introduced. Your understanding of systems thinking and mental models hasn't been directly assessed, but your pattern of individual-level defaults suggests these are areas worth exploring further. Thank you for a thoughtful conversation.`,
      toolCalls: [
        { name: 'update_node_status', input: { node_id: 'scheins-levels', status: 'demonstrated', evidence: 'Initially conflated espoused values with culture, but when Schein\'s framework was named, correctly identified underlying assumptions. Partial understanding — recognizes levels when prompted.' } },
        { name: 'update_node_status', input: { node_id: 'resistance-to-change', status: 'demonstrated', evidence: 'Articulated resistance as rational structural response when heavily scaffolded. Genuine shift in understanding, but durability uncertain.' } },
        { name: 'update_node_status', input: { node_id: 'culture-change-implementation', status: 'gap_detected', evidence: 'Cannot independently analyze culture-change dynamics through a structural lens. Defaults to individual explanations. Can engage structurally when guided, but the structural-vs-individual distinction is not yet internalized.', trace_to: 'structural-vs-individual' } },
        { name: 'update_node_status', input: { node_id: 'systems-thinking', status: 'gap_detected', evidence: 'Not directly assessed, but learner\'s consistent linear, individual-level reasoning suggests limited systems thinking. Did not spontaneously identify feedback loops or emergent dynamics.', trace_to: 'systems-thinking' } },
        { name: 'get_evidence_state', input: {} },
        { name: 'conclude_assessment', input: { summary: 'Learner defaults to individual-level explanations. Can reason structurally when heavily scaffolded. Key gap: structural-vs-individual distinction not internalized. Schein\'s levels partially understood. Systems thinking and mental models not assessed.' } },
      ],
    },
    learner: null,
  },
];
