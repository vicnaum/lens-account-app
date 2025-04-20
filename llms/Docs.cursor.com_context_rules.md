[Cursor home page![light logo](https://mintlify.s3.us-west-1.amazonaws.com/cursor/images/logo/app-logo.svg)![dark logo](https://mintlify.s3.us-west-1.amazonaws.com/cursor/images/logo/app-logo.svg)](/)

Search or ask...

*   [Login](https://www.cursor.com/api/auth/login)
    
*   [Download](https://cursor.com)
    
*   [Download](https://cursor.com)
    

Search...

Navigation

Context

Rules

*   [Documentation](/get-started/welcome)
    
*   [Website](https://cursor.com/)
    
*   [Forum](https://forum.cursor.com/)
    
*   [Get Help](mailto:hi@cursor.com)
    

*   [Welcome to Cursor](/get-started/welcome)
    

##### Get Started

*   [Introduction](/get-started/introduction)
    
*   [Installation](/get-started/installation)
    
*   [FAQ](/faq)
    

##### Guides

*   Editor Migration
    
*   Languages & Frameworks
    

##### Editor

*   Tab
    
*   Chat
    
*   ⌘K
    
*   [AI Commit Message](/more/ai-commit-message)
    
*   [Notepads (Beta)](/beta/notepads)
    
*   [Keyboard Shortcuts](/kbd)
    

##### Context

*   [Codebase Indexing](/context/codebase-indexing)
    
*   [Rules](/context/rules)
    
*   @ Symbols
    
*   [Ignore Files](/context/ignore-files)
    
*   [Model Context Protocol](/context/model-context-protocol)
    

##### Account

*   [Plans & Usage](/account/plans-and-usage)
    
*   Business
    
*   [Dashboard](/account/dashboard)
    
*   [Billing](/account/billing)
    
*   [Pricing](https://cursor.com/pricing)
    
*   [Privacy & Security](/account/privacy)
    

##### Settings

*   [Models](/settings/models)
    
*   [Custom API Keys](/settings/api-keys)
    
*   [Early Access Program](/settings/beta)
    

##### Troubleshooting

*   [Common Issues](/troubleshooting/common-issues)
    
*   [Troubleshooting Guide](/troubleshooting/troubleshooting-guide)
    
*   [Getting a Request ID](/troubleshooting/request-reporting)
    

Context

Rules
=====

Control how the Agent model behaves with reusable, scoped instructions.

Rules allow you to provide system-level guidance to the Agent and Cmd-K AI. Think of them as a persistent way to encode context, preferences, or workflows for your projects or for yourself.

We support three types of rules:

Project Rules
-------------

Stored in `.cursor/rules`, version-controlled and scoped to your codebase.

User Rules
----------

Global to your Cursor environment. Defined in settings and always applied.

.cursorrules (Legacy)
---------------------

Still supported, but deprecated. Use Project Rules instead.

* * *

[​](#how-rules-work)

How rules work
--------------------------------------

Large language models do not retain memory between completions. Rules solve this by providing persistent, reusable context at the prompt level.

When a rule is applied, its contents are included at the start of the model context. This gives the AI consistent guidance whether it is generating code, interpreting edits, or helping with a workflow.

Rules apply to both [Chat](/chat/overview)
 and [Cmd K](/cmdk/overview)

* * *

[​](#project-rules)

Project rules
------------------------------------

Project rules live in `.cursor/rules`. Each rule is stored as a file and version-controlled. They can be scoped using path patterns, invoked manually, or included based on relevance.

Use project rules to:

*   Encode domain-specific knowledge about your codebase
*   Automate project-specific workflows or templates
*   Standardize style or architecture decisions

### 

[​](#rule-structure)

Rule structure

Each rule file is written in **MDC** (`.mdc`), a lightweight format that supports metadata and content in a single file. Rules supports the following types:

| Rule Type | Description |
| --- | --- |
| `Always` | Always included in the model context |
| `Auto Attached` | Included when files matching a glob pattern are referenced |
| `Agent Requested` | Rule is available to the AI, which decides whether to include it. Must provide a description |
| `Manual` | Only included when explicitly mentioned using `@ruleName` |

#### 

[​](#example-mdc-rule)

Example MDC rule

    ---
    description: RPC Service boilerplate
    globs: 
    alwaysApply: false
    ---
    
    - Use our internal RPC pattern when defining services
    - Always use snake_case for service names.
    
    @service-template.ts
    

Referenced files like `@service-template.ts` will be included as additional context when the rule is triggered.

You can use `Cmd + Shift + P` > “New Cursor Rule” to create a rule quickly from inside Cursor.

### 

[​](#creating-a-rule)

Creating a rule

You can create a rule by using the `New Cursor Rule` command or going to `Cursor Settings > Rules`. This will create a new rule file in the `.cursor/rules` directory. From settings you can also see a list of all rules and their status.

### 

[​](#generating-rules)

Generating rules

You can generate rules directly in a conversation using the `/Generate Cursor Rules` command.

This is very useful when you’ve had a conversation where many decisions were made about how the agent should behave. Simply generate the rule and reuse it in the future.

Your browser does not support the video tag.

* * *

[​](#best-practices)

Best practices
--------------------------------------

Good rules are focused, actionable, and scoped.

*   Keep rules concise. Under 500 lines is a good target
*   Split large concepts into multiple, composable rules
*   Provide concrete examples or referenced files when helpful
*   Avoid vague guidance. Write rules the way you would write a clear internal doc
*   Reuse rules when you find yourself repeating prompts in chat

* * *

[​](#examples)

Examples
--------------------------

Domain-specific guidance

Standards for frontend components and API validation

This rule provides standards for frontend components, ensuring consistent styling and animations:

When working in the components directory:

*   Always use Tailwind for styling
*   Use Framer Motion for animations
*   Follow our component naming conventions

This rule enforces validation standards for API endpoints:

In the API directory:

*   Use zod for all validation
*   Define return types with zod schemas
*   Export types generated from schemas

Boilerplate and templates

Templates for Express services and React components

This rule provides a template for creating new Express services:

Use this template when creating a new Express service:

*   Follow RESTful principles
*   Include error handling middleware
*   Set up proper logging

@express-service-template.ts

This rule defines the structure for React components:

React components should follow this layout:

*   Props interface at the top
*   Component as named export
*   Styles at the bottom

@component-template.tsx

Workflow automation

Automating development workflows and documentation generation

This rule automates the app analysis workflow:

When I ask to analyze the app:

1.  Run the dev server with `npm run dev`
2.  Fetch logs from the console
3.  Suggest performance improvements

This rule helps generate documentation from code:

Help me draft documentation by:

*   Extracting code comments
*   Analyzing README.md
*   Generating markdown documentation

### 

[​](#from-cursor-codebase)

From Cursor codebase

These are rules that we use internally at Cursor

Using Tailwind in Cursor

Tailwind is supported in this VS Code fork!

Usage examples:

*   `text-error-foreground`
*   `bg-input-border`

Adding a new setting in Cursor

First create a property to toggle in `@reactiveStorageTypes.ts`.

Add a default value for it in `INIT_APPLICATION_USER_PERSISTENT_STORAGE` in `@reactiveStorageService.tsx`.

If this is a beta feature, add a toggle in `@settingsBetaTab.tsx`, otherwise add it in `@settingsGeneralTab.tsx`. Toggles can be added as `<SettingsSubSection>` for general checkboxes. Look at the rest of the file for examples of other types.

    <SettingsSubSection
    				label="Your feature name"
    				description="Your feature description"
    				value={
    					vsContext.reactiveStorageService.applicationUserPersistentStorage
    						.myNewProperty ?? false
    				}
    				onChange={(newVal) => {
    					vsContext.reactiveStorageService.setApplicationUserPersistentStorage(
    						'myNewProperty',
    						newVal
    					);
    				}}
    			/>
    

To use it in the app, import the reactiveStorageService and use the property

    const flagIsEnabled = vsContext.reactiveStorageService.applicationUserPersistentStorage.myNewProperty
    

There are many examples available from providers like Next.js, Cloudflare, and Browserbase. Community-contributed rules can be found across multiple crowdsourced collections and repositories online.

* * *

[​](#user-rules)

User rules
------------------------------

User rules are defined in **Cursor Settings > Rules**.

They apply to all projects and are always included in your model context.

Use them to:

*   Set response language or tone
*   Add personal style preferences

**Example:**

    Please reply in a concise style. Avoid unnecessary repetition or filler language.
    

User rules do not support MDC, they are plain text only.

* * *

[​](#team-rules)

Team rules
------------------------------

There is no built-in way to share rules across projects today.

We plan to support shared, MDC-formatted rules that can be referenced across team projects. Until then, you can:

*   Store shared rules in a dedicated repository
*   Copy or symlink them into each project’s `.cursor/rules` directory

* * *

[​](#cursorrules-legacy)

`.cursorrules` (Legacy)
---------------------------------------------------

The `.cursorrules` file in the root of your project is still supported, but will be deprecated. We recommend migrating to the Project Rules format for more control, flexibility, and visibility.

* * *

[​](#faq)

FAQ
----------------

**Why isn’t my rule being applied?**  
Check the rule type. For `Agent Requested`, make sure a description is defined. For `Auto Attached`, ensure the file pattern matches the referenced files.

**Can rules reference other rules or files?**  
Yes. You can use `@filename.ts` to include files in your rule’s context.

**Can I create a rule from chat?**  
Yes. Ask the AI to “turn this into a rule” or “make a reusable rule from this prompt”.

**Do rules impact Cursor Tab or other AI features?** No. Rules are only given to the Agent and Cmd-K AI models.

Was this page helpful?

YesNo

[Codebase Indexing](/context/codebase-indexing)
[Overview](/context/@-symbols/overview)

On this page

*   [How rules work](#how-rules-work)
    
*   [Project rules](#project-rules)
    
*   [Rule structure](#rule-structure)
    
*   [Example MDC rule](#example-mdc-rule)
    
*   [Creating a rule](#creating-a-rule)
    
*   [Generating rules](#generating-rules)
    
*   [Best practices](#best-practices)
    
*   [Examples](#examples)
    
*   [From Cursor codebase](#from-cursor-codebase)
    
*   [User rules](#user-rules)
    
*   [Team rules](#team-rules)
    
*   [.cursorrules (Legacy)](#cursorrules-legacy)
    
*   [FAQ](#faq)
    

[Cursor home page![light logo](https://mintlify.s3.us-west-1.amazonaws.com/cursor/images/logo/app-logo.svg)![dark logo](https://mintlify.s3.us-west-1.amazonaws.com/cursor/images/logo/app-logo.svg)](/)

[x](https://x.com/cursor_ai)
[github](https://github.com/getcursor/cursor/)
[website](https://cursor.com)

Product

[Pricing](https://www.cursor.com/pricing)
[Downloads](https://www.cursor.com/downloads)
[Docs](https://docs.cursor.com)
[Forum](https://forum.cursor.com)

Company

[Careers](https://anysphere.inc)
[About](https://anysphere.inc)
[Security](https://cursor.com/security)
[Privacy](https://cursor.com/privacy)

Resources

[Terms](https://cursor.com/terms-of-service)
[Changelog](https://cursor.com/changelog)
[Twitter](https://x.com/cursor_ai)
[GitHub](https://github.com/getcursor/cursor)

[x](https://x.com/cursor_ai)
[github](https://github.com/getcursor/cursor/)
[website](https://cursor.com)