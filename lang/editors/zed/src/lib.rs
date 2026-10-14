//! Starts the project's TypeScript 7.1 language server for `.crab` files.
//!
//! TypeScript understands `.crab` files through the crabrave content mapper
//! listed in the project's tsconfig.json, so all this extension does is run
//! `node_modules/.bin/tsc --lsp --stdio` with `runExternalCode` enabled.

use zed_extension_api::{
    self as zed, serde_json, settings::LspSettings, LanguageServerId, Result,
};

const SERVER: &str = "crabrave";

struct Crabrave;

/// `node_modules/.bin/tsc` in the worktree, if its TypeScript is 7.1 or later.
fn project_tsc(worktree: &zed::Worktree) -> Option<String> {
    let manifest = worktree
        .read_text_file("node_modules/typescript/package.json")
        .ok()?;
    let manifest: serde_json::Value = serde_json::from_str(&manifest).ok()?;
    let mut version = manifest
        .get("version")?
        .as_str()?
        .split('.')
        .map(|part| part.parse::<u32>().unwrap_or(0));
    let (major, minor) = (version.next()?, version.next()?);
    if major < 7 || (major == 7 && minor < 1) {
        return None;
    }
    let (os, _) = zed::current_platform();
    let launcher = if os == zed::Os::Windows { "tsc.cmd" } else { "tsc" };
    Some(format!("{}/node_modules/.bin/{launcher}", worktree.root_path()))
}

impl zed::Extension for Crabrave {
    fn new() -> Self {
        Crabrave
    }

    fn language_server_command(
        &mut self,
        _language_server_id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<zed::Command> {
        // `lsp.crabrave.binary` in Zed's settings overrides the defaults.
        let binary = LspSettings::for_worktree(SERVER, worktree)
            .ok()
            .and_then(|settings| settings.binary);
        let command = binary
            .as_ref()
            .and_then(|binary| binary.path.clone())
            .or_else(|| project_tsc(worktree))
            .ok_or_else(|| {
                "crabrave: this project has no TypeScript 7.1 or later in node_modules. \
                 Run `npm install -D typescript@next`, or point `lsp.crabrave.binary.path` \
                 at a TypeScript 7.1 `tsc`."
                    .to_string()
            })?;
        let args = binary
            .as_ref()
            .and_then(|binary| binary.arguments.clone())
            .unwrap_or_else(|| vec!["--lsp".into(), "--stdio".into()]);
        let mut env = worktree.shell_env();
        if let Some(extra) = binary.and_then(|binary| binary.env) {
            env.extend(extra);
        }
        Ok(zed::Command { command, args, env })
    }

    fn language_server_initialization_options(
        &mut self,
        _language_server_id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<Option<serde_json::Value>> {
        // Content mappers run code from node_modules, so TypeScript only loads
        // them when asked to.
        let mut options = serde_json::Map::new();
        options.insert("runExternalCode".into(), true.into());
        if let Some(serde_json::Value::Object(extra)) = LspSettings::for_worktree(SERVER, worktree)
            .ok()
            .and_then(|settings| settings.initialization_options)
        {
            options.extend(extra);
        }
        Ok(Some(serde_json::Value::Object(options)))
    }
}

zed::register_extension!(Crabrave);
