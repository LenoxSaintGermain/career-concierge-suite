export const LIVE_INTAKE_TOOL_NAMES = [
  'focus_intake_field',
  'jump_intake_screen',
  'set_intake_text_field',
  'set_intake_choice_field',
  'set_intake_multi_field',
  'set_intake_boolean_field',
  'clear_intake_field',
  'set_intake_intent',
  'set_support_preference',
  'summarize_intake_state',
];

export const LIVE_INTAKE_FUNCTION_DECLARATIONS = [
  {
    name: 'focus_intake_field',
    description:
      'Focus a visible Smart Start Intake field so the user can see where the concierge is working.',
    parameters: {
      type: 'OBJECT',
      properties: {
        field_id: {
          type: 'STRING',
          description: 'The Smart Start Intake field id to focus.',
        },
      },
      required: ['field_id'],
    },
  },
  {
    name: 'jump_intake_screen',
    description: 'Move Smart Start Intake to a specific screen or act.',
    parameters: {
      type: 'OBJECT',
      properties: {
        screen_id: {
          type: 'STRING',
          description: 'The Smart Start screen id to activate.',
          enum: ['screen_1', 'screen_2', 'screen_3', 'screen_4'],
        },
      },
      required: ['screen_id'],
    },
  },
  {
    name: 'set_intake_text_field',
    description: 'Write a plain-text value into a Smart Start Intake field.',
    parameters: {
      type: 'OBJECT',
      properties: {
        field_id: {
          type: 'STRING',
          description: 'The Smart Start text field id to update.',
        },
        value: {
          type: 'STRING',
          description: 'The text value to write into the field.',
        },
      },
      required: ['field_id', 'value'],
    },
  },
  {
    name: 'set_intake_choice_field',
    description: 'Set a single-choice Smart Start Intake field using one allowed option.',
    parameters: {
      type: 'OBJECT',
      properties: {
        field_id: {
          type: 'STRING',
          description: 'The Smart Start single-choice field id to update.',
        },
        value: {
          type: 'STRING',
          description: 'The allowed option value to apply.',
        },
      },
      required: ['field_id', 'value'],
    },
  },
  {
    name: 'set_intake_multi_field',
    description: 'Replace, add, or remove values from a Smart Start multi-select field.',
    parameters: {
      type: 'OBJECT',
      properties: {
        field_id: {
          type: 'STRING',
          description: 'The Smart Start multi-select field id to update.',
        },
        values: {
          type: 'ARRAY',
          description: 'One or more option values to apply.',
          items: {
            type: 'STRING',
          },
        },
        mode: {
          type: 'STRING',
          description: 'How the supplied values should be applied.',
          enum: ['replace', 'add', 'remove'],
        },
      },
      required: ['field_id', 'values'],
    },
  },
  {
    name: 'set_intake_boolean_field',
    description: 'Set a boolean Smart Start Intake field.',
    parameters: {
      type: 'OBJECT',
      properties: {
        field_id: {
          type: 'STRING',
          description: 'The Smart Start boolean field id to update.',
        },
        value: {
          type: 'BOOLEAN',
          description: 'The boolean value to apply.',
        },
      },
      required: ['field_id', 'value'],
    },
  },
  {
    name: 'clear_intake_field',
    description: 'Clear a Smart Start Intake field at the user’s request.',
    parameters: {
      type: 'OBJECT',
      properties: {
        field_id: {
          type: 'STRING',
          description: 'The Smart Start field id to clear.',
        },
      },
      required: ['field_id'],
    },
  },
  {
    name: 'set_intake_intent',
    description:
      'Set the Smart Start route based on whether the client wants to stay sharp, make a move, or define a direction.',
    parameters: {
      type: 'OBJECT',
      properties: {
        intent: {
          type: 'STRING',
          description: 'The Smart Start client intent.',
          enum: ['current_role', 'target_role', 'not_sure'],
        },
      },
      required: ['intent'],
    },
  },
  {
    name: 'set_support_preference',
    description: 'Set either the Smart Start pace preference or focus preference.',
    parameters: {
      type: 'OBJECT',
      properties: {
        preference: {
          type: 'STRING',
          description: 'Which Smart Start preference is being updated.',
          enum: ['pace', 'focus'],
        },
        value: {
          type: 'STRING',
          description: 'The preference value to apply.',
        },
      },
      required: ['preference', 'value'],
    },
  },
  {
    name: 'summarize_intake_state',
    description:
      'Summarize what Smart Start Intake already knows so far before asking the next question.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
];

export const LIVE_INTAKE_TOOL_CONFIG = {
  functionCallingConfig: {
    mode: 'VALIDATED',
    allowedFunctionNames: LIVE_INTAKE_TOOL_NAMES,
  },
};
