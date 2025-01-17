import streamlit as st
import pandas as pd

# Create the line chart with plotly for more customization
import plotly.express as px


def update_team_totals(bracket_dfs, teams):
    st.session_state.team_totals = {
        team["team_name"]: 0 for team in bracket_dfs[0].to_dict("records")
    }
    for df in bracket_dfs:
        if len(df) >= 1:
            winner = df.iloc[0]["team_name"]

            st.session_state.team_totals[winner] += 50
        if len(df) >= 2:
            runner_up = df.iloc[1]["team_name"]
            st.session_state.team_totals[runner_up] += 25


# @st.cache_data
def load_current_gw_teams():
    # Read current gw, use as gw[0]
    with open(r"drafty/data_gw", "r") as fp:
        gw = fp.readlines()
    # Read in team names
    with open(r"drafty/data_teams", "r") as fp:
        t = fp.readlines()
        teams = [i.strip() for i in t]

    return gw[0], teams


# @st.cache_data
def load_bracket_dfs():
    bracket_1 = pd.read_csv("drafty/data/results_1.csv")
    bracket_1["points"] = bracket_1["points"].astype(int)
    bracket_1 = bracket_1.sort_values(by="points", ascending=False)

    bracket_2 = pd.read_csv("drafty/data/results_2.csv")
    bracket_2["points"] = bracket_2["points"].astype(int)
    bracket_2 = bracket_2.sort_values(by="points", ascending=False)

    bracket_3 = pd.read_csv("drafty/data/results_3.csv")
    bracket_3["points"] = bracket_3["points"].astype(int)
    bracket_3 = bracket_3.sort_values(by="points", ascending=False)

    bracket_4 = pd.read_csv("drafty/data/results_4.csv")
    bracket_4["points"] = bracket_4["points"].astype(int)
    bracket_4 = bracket_4.sort_values(by="points", ascending=False)

    return bracket_1, bracket_2, bracket_3, bracket_4


# @st.cache_data
def standings():
    col_names = {
        "gw": "Gameweek",
        "pos": "Position",
        "name": "Name",
    }
    standings_ts = pd.read_csv("drafty/data/standings_ts.csv")
    standings_ts["pos"] = standings_ts["pos"] * -1
    standings_ts = standings_ts.rename(columns=col_names)
    standings_ts["Gameweek"] = standings_ts["Gameweek"].astype(int)

    cumm_points = pd.read_csv("drafty/data/cumm_points.csv")

    return standings_ts, cumm_points


gw, teams = load_current_gw_teams()
(bracket_1, bracket_2, bracket_3, bracket_4) = load_bracket_dfs()
standings_ts, cumm_points = standings()

# Space out the maps so the first one is 2x the size of the other three
c1, c2, c3 = st.columns((0.50, 0.05, 0.50))

c1.header("Standings by GW Bracket")
gwbracket = c1.radio(
    "Choose GW Bracket. **\$50** Bracket Winner, **\$25** for Runner-up",
    ["Bracket 1", "Bracket 2", "Bracket 3", "Bracket 4"],
    captions=["GW 1 - 10", "GW 11 - 20", "GW 21 - 29", "GW 30 - 38"],
    horizontal=True,
    index=2,
)

if gwbracket == "Bracket 1":
    c1.dataframe(
        bracket_1.style.background_gradient(cmap="YlGn"),
        column_config={
            "img": st.column_config.ImageColumn(
                "DP", help="Streamlit app preview screenshots"
            )
        },
        hide_index=True,
        use_container_width=True,
    )
    update_team_totals([bracket_1], teams)

elif gwbracket == "Bracket 2":
    c1.dataframe(
        bracket_2.style.background_gradient(cmap="YlGn"),
        column_config={
            "img": st.column_config.ImageColumn(
                "DP", help="Streamlit app preview screenshots"
            )
        },
        hide_index=True,
        use_container_width=True,
    )
    update_team_totals([bracket_1, bracket_2], teams)
elif gwbracket == "Bracket 3":
    c1.dataframe(
        bracket_3.style.background_gradient(cmap="YlGn"),
        column_config={
            "img": st.column_config.ImageColumn(
                "DP", help="Streamlit app preview screenshots"
            )
        },
        hide_index=True,
        use_container_width=True,
    )
    update_team_totals([bracket_1, bracket_2, bracket_3], teams)
elif gwbracket == "Bracket 4":
    c1.dataframe(
        bracket_4.style.background_gradient(cmap="YlGn"),
        column_config={
            "img": st.column_config.ImageColumn(
                "DP", help="Streamlit app preview screenshots"
            )
        },
        hide_index=True,
        use_container_width=True,
    )
    update_team_totals([bracket_1, bracket_2, bracket_3, bracket_4], teams)

# Prepare data for the scoreboard
totals_df = pd.DataFrame(
    list(st.session_state.team_totals.items()), columns=["Team", "Total"]
)
totals_df = totals_df.sort_values("Total", ascending=False)

c3.header(f"Earnings up to {gwbracket} 💰")
c3.caption("(Provisional for latest GW Bracket)")

container_template = """
<div style="background: linear-gradient(145deg, #1e1e1e, #2d2d2d); padding: 20px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
{content}
</div>
"""

row_template = """
<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 20px; margin: 4px 0; background: linear-gradient(90deg, rgba(45,45,45,0.9) 0%, rgba(45,45,45,0.7) 100%); border-radius: 8px; color: white; font-family: Arial, sans-serif;">
    <div style="display: flex; align-items: center; gap: 10px;">
        <span style="color: #888; font-size: 14px;">#{rank}</span>
        <span style="font-size: 16px;">⚽ {team}</span>
    </div>
    <span style="color: #2ecc71; font-weight: bold; font-size: 18px; font-family: monospace;">{total}</span>
</div>
"""

rows = []
for idx, row in totals_df.iterrows():
    team = row["Team"]
    total = (
        f"${row['Total']}" if isinstance(row["Total"], (int, float)) else row["Total"]
    )
    rows.append(row_template.format(rank=idx + 1, team=team, total=total))

html = container_template.format(content="".join(rows))
c3.markdown(html, unsafe_allow_html=True)

# Footer
st.sidebar.caption("Updated as of GW: " + str(gw))

st.markdown("<br><br>", unsafe_allow_html=True)

st.header(f"Timeline of Standings")
# First invert the Position values to be positive
standings_ts["Position"] = standings_ts["Position"].abs()


fig = px.line(
    standings_ts,
    x="Gameweek",
    y="Position",
    color="Name",
)

fig.update_layout(
    yaxis={
        "autorange": "reversed",
        "title": "Position",
        "tickmode": "linear",
        "tick0": 1,
        "dtick": 1,
    },
    xaxis=dict(
        dtick=1,
    ),
    height=400,
    margin=dict(l=40, r=40, t=40, b=40),  # Tighter margins
    template="plotly_dark",
    legend=dict(
        orientation="h",  # Horizontal legend
        yanchor="bottom",
        y=1.02,
        xanchor="right",
        x=1,
    ),
    font=dict(size=12),  # Smaller font
)

# Get final positions for each team
final_positions = standings_ts.groupby("Name")["Position"].last()
total_teams = len(final_positions)

# Add images with distributed y-positions
for i, (name, final_pos) in enumerate(final_positions.items()):
    # Calculate normalized y position (0 to 1)
    y_pos = 1 - ((final_pos - 1) / (total_teams - 1)) if total_teams > 1 else 0.5

    fig.add_layout_image(
        dict(
            source=f"app/static/{name}.png",
            xref="paper",
            yref="paper",
            x=1.02,  # Moved slightly further right
            y=y_pos,  # Distributed vertically
            sizex=0.07,  # Slightly smaller
            sizey=0.07,  # Keep aspect ratio square
            xanchor="left",
            yanchor="middle",
        )
    )

# # Add more right margin for images
# fig.update_layout(
#     margin=dict(r=100),
#     legend=dict(
#         x=1.05,
#         xanchor="left",
#         yanchor="middle",
#     ),
# )

st.plotly_chart(fig, use_container_width=True)
