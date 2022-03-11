<script lang="ts">
  import { Router, Route } from "svelte-navigator"
	import TaskGroups from "./routes/TaskGroups.svelte"
  import TaskGroup from "./routes/TaskGroup.svelte"
  import Channels from "./routes/Channels.svelte"
  import {
    Header,
    HeaderNav,
    HeaderNavItem,
    Content,
    Grid,
    Row,
    Column,
    SideNav,
    SideNavItems,
    SideNavLink
  } from "carbon-components-svelte"

  let isSideNavOpen = false
</script>

<Router>
  <Header company="Crew" bind:isSideNavOpen>
    <HeaderNav>
      <HeaderNavItem href="/" text="Task Groups" />
      <HeaderNavItem href="/channels" text="Channels" />
    </HeaderNav>
  </Header>

  <SideNav bind:isOpen={isSideNavOpen}>
    <SideNavItems>
      <SideNavLink href="/" text="Task Groups" />
      <SideNavLink href="/channels" text="Channels" />
    </SideNavItems>
  </SideNav>

  <Content>
    <Grid>
      <Row>
        <Column>
          <Route path="/">
            <TaskGroups />
          </Route>
          <Route path="/channels">
            <Channels />
          </Route>
          <Route path="/task_group/:id" let:params>
            <TaskGroup groupId={params.id} />
          </Route>
        </Column>
      </Row>
    </Grid>
  </Content>
</Router>
