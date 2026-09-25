import type { Condition, LevelDefinition } from '../levels/types';

export type RuleSnapshot = {
    plateActive: ReadonlySet<string>;
    enemyDefeated: ReadonlySet<string>;
    portalReached: ReadonlySet<string>;
    zoneVisited: ReadonlySet<string>;
};

/** Pure evaluation against one frame's snapshot; actions cannot cascade in that frame. */
export function evaluateCondition(condition: Condition, state: RuleSnapshot): boolean {
    switch (condition.type) {
        case 'all':
            return condition.conditions.every((child) => evaluateCondition(child, state));
        case 'any':
            return condition.conditions.some((child) => evaluateCondition(child, state));
        default:
            return state[condition.type].has(condition.target);
    }
}

export class LevelRules {
    private readonly fired = new Set<string>();
    complete = false;

    private readonly definition: LevelDefinition;
    constructor(definition: LevelDefinition) {
        this.definition = definition;
    }

    update(snapshot: RuleSnapshot) {
        const activated = this.definition.rules.filter(
            (rule) => !this.fired.has(rule.id) && evaluateCondition(rule.when, snapshot)
        );
        for (const rule of activated) this.fired.add(rule.id);
        this.complete = evaluateCondition(this.definition.completion, snapshot);
        return activated;
    }

    diagnostics() {
        return { activatedRules: [...this.fired], complete: this.complete };
    }
    reset() {
        this.fired.clear();
        this.complete = false;
    }
}
