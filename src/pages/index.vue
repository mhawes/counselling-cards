<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title> Counselling Cards </q-toolbar-title>
        <q-btn
          flat
          dense
          round
          icon="home"
          aria-label="Menu"
          to="/"
          label="Home"
          no-caps
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts"></script>
