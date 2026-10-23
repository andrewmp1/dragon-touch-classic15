import assert from 'node:assert/strict';
import test from 'node:test';
import { frameTarget, configureFrame } from '../setup.mjs';

function fakeAdb(build = 'Classic15-Pro_A33.080124_V02') {
  const calls = [];
  return {
    calls,
    adb(args) {
      calls.push(args);
      const command = args.join(' ');
      if (command === 'devices') return 'List of devices attached\ntest-device\tdevice';
      if (command.endsWith('getprop ro.build.display.id')) return build;
      if (command.endsWith('getprop ro.serialno')) return 'test-serial';
      if (command.endsWith('pm list packages -d')) return 'package:com.waophoto.smartframe';
      if (command.endsWith('get system accelerometer_rotation')) return '0';
      if (command.endsWith('get system user_rotation')) return '1';
      return '';
    },
  };
}

test('device mismatch prevents package and settings changes', () => {
  const fake = fakeAdb('another-build');
  assert.throws(() => frameTarget(fake.adb, {}), /build did not match/);
  assert.throws(() => configureFrame('test-device', 'http://example.test:8787/', 'http://example.test:8788/', fake.adb), /build changed/);
  assert.ok(fake.calls.every(args => !args.includes('disable') && !args.includes('put')));
});
test('optional serial check prevents selecting a different frame', () => {
  const fake = fakeAdb();
  assert.throws(() => frameTarget(fake.adb, { AGENDA_FRAME_SERIAL: 'another-serial' }), /serial did not match/);
});
test('setup disables only the photo app and reproduces verified rotation settings', () => {
  const fake = fakeAdb();
  const target = frameTarget(fake.adb, {});
  configureFrame(target, 'http://example.test:8787/', 'http://example.test:8788/', fake.adb);
  const commands = fake.calls.map(args => args.join(' '));
  assert.ok(commands.some(command => command.endsWith('pm disable com.waophoto.smartframe')));
  assert.ok(commands.some(command => command.endsWith('put system accelerometer_rotation 0')));
  assert.ok(commands.some(command => command.endsWith('put system user_rotation 1')));
  assert.ok(commands.every(command => !command.includes('com.adups.fota') && !command.includes('pm clear')));
  const opens = commands.filter(command => command.includes('shell am start'));
  assert.equal(opens.length, 2);
  assert.match(opens[0], /classic15.whiteboard/);
  assert.match(opens[1], /classic15.agenda/);
});
test('unsafe host URL fails before making any ADB call', () => {
  const fake = fakeAdb();
  assert.throws(() => configureFrame('test-device', "http://example.test/';id", 'http://example.test:8788/', fake.adb));
  assert.equal(fake.calls.length, 0);
});
test('orientation readback failure prevents browser launch', () => {
  const fake = fakeAdb();
  const adb = args => args.join(' ').endsWith('get system user_rotation') ? '0' : fake.adb(args);
  assert.throws(() => configureFrame('test-device', 'http://example.test:8787/', 'http://example.test:8788/', adb), /did not persist/);
  assert.ok(fake.calls.every(args => !args.includes('start')));
});
