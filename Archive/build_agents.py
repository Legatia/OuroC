#!/usr/bin/env python3
"""
Build script for Ouro-C Python agents using Kybra CDK.
Compiles Python agents to WebAssembly for ICP deployment.
"""

import subprocess
import os
import sys
from pathlib import Path

def run_command(cmd, cwd=None):
    """Run a command and return the result."""
    print(f"Running: {cmd}")
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            check=True
        )
        print(f"✅ Success: {cmd}")
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed: {cmd}")
        print(f"Error: {e.stderr}")
        return False, e.stderr

def ensure_directory(path):
    """Ensure directory exists."""
    Path(path).mkdir(parents=True, exist_ok=True)

def main():
    """Build all Python agents for ICP deployment."""
    project_root = Path(__file__).parent
    agents_dir = project_root / "src" / "agents"
    target_dir = project_root / "target" / "wasm32-unknown-unknown" / "release"

    print("🚀 Building Ouro-C Python Agents for ICP deployment")
    print("=" * 60)

    # Ensure target directory exists
    ensure_directory(target_dir)

    # List of agents to build
    agents = [
        {
            "name": "SolanaMonitoringAgent",
            "source": "solana_monitoring_agent.py",
            "output": "solana_monitoring_agent.wasm"
        },
        {
            "name": "ContractMonitoringAgent",
            "source": "contract_monitoring_agent.py",
            "output": "contract_monitoring_agent.wasm"
        }
    ]

    success_count = 0
    total_count = len(agents)

    for agent in agents:
        print(f"\n📦 Building {agent['name']}...")
        print(f"   Source: {agent['source']}")
        print(f"   Output: {agent['output']}")

        source_path = agents_dir / agent["source"]
        output_path = target_dir / agent["output"]

        # Check if source exists
        if not source_path.exists():
            print(f"❌ Source file not found: {source_path}")
            continue

        # Compile with Kybra
        cmd = f"python -m kybra compile {source_path} -o {output_path}"
        success, output = run_command(cmd, cwd=project_root)

        if success:
            # Verify WASM file was created
            if output_path.exists():
                size = output_path.stat().st_size
                print(f"✅ {agent['name']} built successfully ({size:,} bytes)")
                success_count += 1
            else:
                print(f"❌ {agent['name']} build failed - WASM file not created")
        else:
            print(f"❌ {agent['name']} build failed")

    print("\n" + "=" * 60)
    print(f"📊 Build Summary: {success_count}/{total_count} agents built successfully")

    if success_count == total_count:
        print("🎉 All agents built successfully!")
        print("\n📋 Next steps:")
        print("   1. Start local dfx network: dfx start --background")
        print("   2. Deploy agents: dfx deploy")
        print("   3. Verify deployment: dfx canister status")
        return 0
    else:
        print("⚠️  Some agents failed to build. Check the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())