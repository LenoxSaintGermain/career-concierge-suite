import { useCallback, useRef, useState } from 'react';

export interface GhostAction {
  id: string;
  tool: string;
  params: Record<string, unknown>;
  timestamp: number;
}

type GhostResult = string | number | void;

export interface GhostCallbacks {
  onNavigateModule: (target: string) => GhostResult;
  onCloseModule: () => GhostResult;
  onToggleAdmin: () => GhostResult;
  onDispatchAgent: (codename: string) => GhostResult;
  onUpdateStance: (stance: 'delegator' | 'copilot') => GhostResult;
  onAddressGap: (gapId: string) => GhostResult;
  onFocusIntakeField: (fieldId: string) => GhostResult;
  onJumpIntakeScreen: (screenId: string) => GhostResult;
  onSetIntakeTextField: (fieldId: string, value: string) => GhostResult;
  onSetIntakeChoiceField: (fieldId: string, value: string) => GhostResult;
  onSetIntakeMultiField: (
    fieldId: string,
    values: string[],
    mode: 'replace' | 'add' | 'remove'
  ) => GhostResult;
  onSetIntakeBooleanField: (fieldId: string, value: boolean) => GhostResult;
  onClearIntakeField: (fieldId: string) => GhostResult;
  onSetIntentRoute: (intent: string) => GhostResult;
  onSetSupportPreference: (preference: 'pace' | 'focus', value: string) => GhostResult;
  onSummarizeIntakeState: () => GhostResult;
}

const resolveResult = (result: GhostResult, fallback: string) => {
  if (result === undefined || result === null || result === '') return fallback;
  return typeof result === 'string' || typeof result === 'number' ? result : fallback;
};

/**
 * Ghost client tool handlers.
 * Returns a clientTools map compatible with @elevenlabs/react useConversation
 * and a log of recent actions for the GhostActionFeed.
 */
export function useGhostVoice(callbacks: GhostCallbacks) {
  const [actionLog, setActionLog] = useState<GhostAction[]>([]);
  const idCounter = useRef(0);

  const logAction = useCallback((tool: string, params: Record<string, unknown>) => {
    const id = `ghost-${++idCounter.current}`;
    const action: GhostAction = { id, tool, params, timestamp: Date.now() };
    setActionLog((prev) => [action, ...prev].slice(0, 20));
    return action;
  }, []);

  const clientTools = {
    navigate_module: (parameters: { target: string }) => {
      logAction('navigate_module', parameters);
      return resolveResult(callbacks.onNavigateModule(parameters.target), 'Routed.');
    },
    close_module: () => {
      logAction('close_module', {});
      return resolveResult(callbacks.onCloseModule(), 'Closed.');
    },
    toggle_admin: () => {
      logAction('toggle_admin', {});
      return resolveResult(callbacks.onToggleAdmin(), 'Toggled.');
    },
    dispatch_agent: (parameters: { codename: string }) => {
      logAction('dispatch_agent', parameters);
      return resolveResult(callbacks.onDispatchAgent(parameters.codename), 'Dispatched.');
    },
    update_stance: (parameters: { stance: 'delegator' | 'copilot' }) => {
      logAction('update_stance', parameters);
      return resolveResult(callbacks.onUpdateStance(parameters.stance), 'Stance updated.');
    },
    address_gap: (parameters: { gap_id: string }) => {
      logAction('address_gap', parameters);
      return resolveResult(callbacks.onAddressGap(parameters.gap_id), 'Gap addressed.');
    },
    focus_intake_field: (parameters: { field_id: string }) => {
      logAction('focus_intake_field', parameters);
      return resolveResult(callbacks.onFocusIntakeField(parameters.field_id), 'Field focused.');
    },
    jump_intake_screen: (parameters: { screen_id: string }) => {
      logAction('jump_intake_screen', parameters);
      return resolveResult(callbacks.onJumpIntakeScreen(parameters.screen_id), 'Screen changed.');
    },
    set_intake_text_field: (parameters: { field_id: string; value: string }) => {
      logAction('set_intake_text_field', parameters);
      return resolveResult(
        callbacks.onSetIntakeTextField(parameters.field_id, parameters.value),
        'Text field updated.',
      );
    },
    set_intake_choice_field: (parameters: { field_id: string; value: string }) => {
      logAction('set_intake_choice_field', parameters);
      return resolveResult(
        callbacks.onSetIntakeChoiceField(parameters.field_id, parameters.value),
        'Choice field updated.',
      );
    },
    set_intake_multi_field: (parameters: {
      field_id: string;
      values: string[];
      mode?: 'replace' | 'add' | 'remove';
    }) => {
      logAction('set_intake_multi_field', parameters);
      return resolveResult(
        callbacks.onSetIntakeMultiField(
          parameters.field_id,
          Array.isArray(parameters.values) ? parameters.values : [],
          parameters.mode === 'add' || parameters.mode === 'remove' ? parameters.mode : 'replace',
        ),
        'Multi-select field updated.',
      );
    },
    set_intake_boolean_field: (parameters: { field_id: string; value: boolean }) => {
      logAction('set_intake_boolean_field', parameters);
      return resolveResult(
        callbacks.onSetIntakeBooleanField(parameters.field_id, Boolean(parameters.value)),
        'Boolean field updated.',
      );
    },
    clear_intake_field: (parameters: { field_id: string }) => {
      logAction('clear_intake_field', parameters);
      return resolveResult(callbacks.onClearIntakeField(parameters.field_id), 'Field cleared.');
    },
    set_intake_intent: (parameters: { intent: string }) => {
      logAction('set_intake_intent', parameters);
      return resolveResult(callbacks.onSetIntentRoute(parameters.intent), 'Intent updated.');
    },
    set_support_preference: (parameters: { preference: 'pace' | 'focus'; value: string }) => {
      logAction('set_support_preference', parameters);
      return resolveResult(
        callbacks.onSetSupportPreference(parameters.preference, parameters.value),
        'Support preference updated.',
      );
    },
    summarize_intake_state: () => {
      logAction('summarize_intake_state', {});
      return resolveResult(callbacks.onSummarizeIntakeState(), 'Intake summary ready.');
    },
  };

  return {
    clientTools,
    actionLog,
  };
}
